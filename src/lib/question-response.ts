import { prisma } from "@/lib/prisma";
import { getAppUrl, sendEmail } from "@/lib/email";
import { createNotice, NOTICE_TYPES } from "@/lib/notices";
import {
  canIssueResponseToken,
  createQuestionResponseToken,
  hashQuestionToken,
  prepareAnswer,
  resolveTokenAccess,
  responseUrlForToken,
  toArtistResponseView,
  tokenAccessMessage,
  type QuestionStatus
} from "@/lib/question-intake";
import { sendEmailOnce } from "@/lib/notifications";

const questionInclude = {
  exhibition: { select: { id: true, title: true, artist: true, venue: true } },
  artist: { select: { id: true, name: true, nickname: true } },
  work: { select: { id: true, title: true } },
  recipients: {
    orderBy: { createdAt: "asc" as const },
    take: 1
  }
};

function artistNameFromQuestion(row: {
  exhibition: { artist: string } | null;
  artist: { name: string; nickname: string | null } | null;
}) {
  return (
    row.exhibition?.artist ||
    row.artist?.nickname ||
    row.artist?.name ||
    null
  );
}

/** 운영자용: 토큰 원문은 이번 응답에만 실어 보내고 DB에는 해시만 둔다. */
export async function issueQuestionResponseToken(questionId: string, origin?: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: questionInclude
  });
  if (!question) return { error: "질문을 찾을 수 없습니다.", status: 404 as const };
  if (!canIssueResponseToken(question.status)) {
    return { error: "이 상태에서는 답변 링크를 만들 수 없습니다.", status: 400 as const };
  }

  const issued = createQuestionResponseToken();

  await prisma.$transaction(async (tx) => {
    // 이전 미사용 토큰은 새 링크로 대체한다.
    await tx.questionResponseToken.updateMany({
      where: { questionId, usedAt: null },
      data: { usedAt: new Date() }
    });
    await tx.questionResponseToken.create({
      data: {
        questionId,
        tokenHash: issued.tokenHash,
        expiresAt: issued.expiresAt
      }
    });
    if (question.status !== "sent") {
      await tx.question.update({
        where: { id: questionId },
        data: { status: "sent" }
      });
    }
    const recipient = question.recipients[0];
    if (recipient) {
      await tx.questionRecipient.update({
        where: { id: recipient.id },
        data: { sentAt: recipient.sentAt ?? new Date() }
      });
    }
  });

  return {
    rawToken: issued.rawToken,
    responseUrl: responseUrlForToken(issued.rawToken, origin),
    expiresAt: issued.expiresAt.toISOString(),
    questionId
  };
}

export async function loadQuestionResponseByRawToken(rawToken: string, now = new Date()) {
  const tokenHash = hashQuestionToken(rawToken);
  const row = await prisma.questionResponseToken.findUnique({
    where: { tokenHash },
    include: {
      question: { include: questionInclude }
    }
  });

  if (!row) {
    return { error: tokenAccessMessage("invalid"), reason: "invalid" as const };
  }

  const access = resolveTokenAccess({
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    questionStatus: row.question.status,
    now
  });
  if (!access.ok) {
    return { error: tokenAccessMessage(access.reason), reason: access.reason };
  }

  return {
    view: toArtistResponseView({
      exhibitionTitle: row.question.exhibition?.title,
      exhibitionArtist: artistNameFromQuestion(row.question),
      workTitle: row.question.work?.title,
      questionText: row.question.text,
      expiresAt: row.expiresAt
    }),
    questionId: row.questionId,
    tokenId: row.id,
    expiresAt: row.expiresAt.toISOString()
  };
}

export async function submitQuestionResponse(rawToken: string, answerText: string, now = new Date()) {
  const prepared = prepareAnswer(answerText);
  if ("error" in prepared) return { error: prepared.error, status: 400 as const };

  const tokenHash = hashQuestionToken(rawToken);
  const row = await prisma.questionResponseToken.findUnique({
    where: { tokenHash },
    include: {
      question: { include: { recipients: { orderBy: { createdAt: "asc" }, take: 1 } } }
    }
  });
  if (!row) {
    return { error: tokenAccessMessage("invalid"), status: 404 as const, reason: "invalid" as const };
  }

  const access = resolveTokenAccess({
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    questionStatus: row.question.status as QuestionStatus,
    now
  });
  if (!access.ok) {
    return {
      error: tokenAccessMessage(access.reason),
      status: access.reason === "expired" || access.reason === "used" ? (410 as const) : (400 as const),
      reason: access.reason
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.questionAnswer.create({
      data: {
        questionId: row.questionId,
        text: prepared.text,
        visibility: "private"
      }
    });
    await tx.questionResponseToken.update({
      where: { id: row.id },
      data: { usedAt: now }
    });
    await tx.question.update({
      where: { id: row.questionId },
      data: { status: "answered" }
    });
    const recipient = row.question.recipients[0];
    if (recipient) {
      await tx.questionRecipient.update({
        where: { id: recipient.id },
        data: { respondedAt: now }
      });
    }
  });

  await notifyAskerAnswerArrived(row.questionId, prepared.text).catch((error) => {
    console.error("notify asker answer failed", { questionId: row.questionId, error });
  });

  return { ok: true as const, questionId: row.questionId };
}

/** 운영자가 관리 화면에서 바로 답변. 토큰 없이 private 답변을 남긴다. */
export async function submitAdminQuestionAnswer(
  questionId: string,
  answerText: string,
  responderId?: string | null,
  now = new Date()
) {
  const prepared = prepareAnswer(answerText);
  if ("error" in prepared) return { error: prepared.error, status: 400 as const };

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { recipients: { orderBy: { createdAt: "asc" }, take: 1 } }
  });
  if (!question) return { error: "질문을 찾을 수 없습니다.", status: 404 as const };
  if (question.status === "closed" || question.status === "rejected") {
    return { error: "닫히거나 반려된 질문에는 답할 수 없습니다.", status: 400 as const };
  }
  if (question.status === "answered") {
    return { error: "이미 답변이 있는 질문입니다.", status: 400 as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.questionAnswer.create({
      data: {
        questionId,
        text: prepared.text,
        visibility: "private",
        responderId: responderId ?? null
      }
    });
    await tx.question.update({
      where: { id: questionId },
      data: { status: "answered" }
    });
    await tx.questionResponseToken.updateMany({
      where: { questionId, usedAt: null },
      data: { usedAt: now }
    });
    const recipient = question.recipients[0];
    if (recipient) {
      await tx.questionRecipient.update({
        where: { id: recipient.id },
        data: { respondedAt: now }
      });
    }
  });

  await notifyAskerAnswerArrived(questionId, prepared.text).catch((error) => {
    console.error("notify asker answer failed", { questionId, error });
  });

  return { ok: true as const, questionId };
}

/** 기존 Notice + Resend 메일 인프라를 재사용한다. 새 알림 시스템을 만들지 않는다. */
async function notifyAskerAnswerArrived(questionId: string, answerText: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      userId: true,
      contactEmail: true,
      notifyOnAnswer: true,
      text: true,
      exhibitionId: true,
      asker: { select: { id: true, email: true, name: true } }
    }
  });
  if (!question) return;

  const href = `/my/questions/${question.id}`;
  const appUrl = getAppUrl(href);
  const inboxUrl = getAppUrl("/my#inbox");

  if (question.userId) {
    await createNotice({
      userId: question.userId,
      type: NOTICE_TYPES.QUESTION_ANSWER,
      title: "답변이 왔어요",
      body: answerText.slice(0, 180),
      href,
      dedupeKey: `intake-answer:${question.id}`
    });
  }

  if (!question.notifyOnAnswer) return;

  const to = question.asker?.email || question.contactEmail;
  if (!to) return;

  const subject = "[OOOF.] 답변이 왔어요";
  const text = question.userId
    ? `질문: ${question.text}\n\n답변: ${answerText}\n\n답변이 왔어요. 작가의 이야기를 확인해 보세요.\n${appUrl}\n\n질문 함: ${inboxUrl}`
    : `질문: ${question.text}\n\n답변: ${answerText}\n\n답변이 왔어요. (비로그인으로 남긴 질문은 메일에서 바로 확인하세요.)`;
  const html = question.userId
    ? `<p>질문</p><p>${escapeHtml(question.text)}</p><p>답변</p><p>${escapeHtml(answerText)}</p><p>답변이 왔어요. 작가의 이야기를 확인해 보세요.</p><p><a href="${appUrl}">답변 확인하기</a></p><p style="font-size:13px;color:#666;">링크가 열리지 않으면 MY → 내 질문 함에서도 볼 수 있어요.<br/><a href="${inboxUrl}">${inboxUrl}</a></p>`
    : `<p>질문</p><p>${escapeHtml(question.text)}</p><p>답변</p><p>${escapeHtml(answerText)}</p><p>답변이 왔어요. 비로그인으로 남긴 질문은 이 메일에서 바로 확인하세요.</p>`;

  if (question.userId) {
    await sendEmailOnce({
      userId: question.userId,
      type: "INTAKE_QUESTION_ANSWER",
      dedupeKey: `intake-answer-mail:${question.id}`,
      to,
      subject,
      html,
      text,
      exhibitionId: question.exhibitionId ?? undefined
    });
    return;
  }

  await sendEmail({ to, subject, html, text });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
