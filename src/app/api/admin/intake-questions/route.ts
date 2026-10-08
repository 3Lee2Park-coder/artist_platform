import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import {
  assertAdminRole,
  canOperatorSetStatus,
  intakeContentWarnings,
  QUESTION_STATUSES,
  type QuestionStatus
} from "@/lib/question-intake";
import { setQuestionAnswerVisibility } from "@/lib/public-questions";
import {
  issueQuestionResponseToken,
  submitAdminQuestionAnswer
} from "@/lib/question-response";
import { NextResponse } from "next/server";
import { z } from "zod";

const include = {
  exhibition: { select: { id: true, title: true, artist: true, venue: true } },
  artist: { select: { id: true, name: true, nickname: true } },
  work: { select: { id: true, title: true } },
  venue: { select: { id: true, name: true } },
  answers: {
    where: { visibility: { in: ["private", "public"] } },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      text: true,
      visibility: true,
      updatedAt: true
    }
  },
  recipients: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      recipientType: true,
      opsNote: true,
      recipientId: true
    }
  }
};

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["sent", "rejected", "closed"]).optional(),
  recipientType: z.enum(["artist", "gallery", "ooof"]).optional(),
  opsNote: z.string().max(400).optional(),
  /** true면 sent로 맞추고 만료형 답변 링크를 새로 발급한다. 원문은 이번 응답에만 실는다. */
  issueToken: z.boolean().optional(),
  /** 운영자만 private↔public. 자동 publish 없음. */
  answerVisibility: z.enum(["private", "public"]).optional(),
  /** 운영자가 토큰 없이 바로 답변 (OOOF. 대행). */
  answerText: z.string().min(1).max(2000).optional()
});

async function requireAdmin() {
  const session = await getSession();
  const message = assertAdminRole(session?.role);
  if (message || !session) return null;
  return session;
}

function present(row: {
  id: string;
  text: string;
  status: string;
  audience: string;
  notifyOnAnswer: boolean;
  contactEmail: string | null;
  createdAt: Date;
  exhibitionId: string | null;
  exhibition: { title: string; artist: string; venue: string } | null;
  artist: { name: string; nickname: string | null } | null;
  work: { title: string } | null;
  venue: { name: string } | null;
  answers?: Array<{
    id: string;
    text: string;
    visibility: string;
    updatedAt: Date;
  }>;
  recipients: Array<{
    id: string;
    recipientType: string;
    opsNote: string | null;
    recipientId: string | null;
  }>;
}) {
  const recipient = row.recipients[0];
  const answer = row.answers?.[0];
  return {
    id: row.id,
    text: row.text,
    status: row.status,
    audience: row.audience,
    notifyOnAnswer: row.notifyOnAnswer,
    contactEmail: row.contactEmail,
    createdAt: row.createdAt.toISOString(),
    exhibitionId: row.exhibitionId,
    exhibitionTitle: row.exhibition?.title ?? null,
    exhibitionArtist: row.exhibition?.artist ?? row.artist?.nickname ?? row.artist?.name ?? null,
    exhibitionVenue: row.exhibition?.venue ?? row.venue?.name ?? null,
    workTitle: row.work?.title ?? null,
    warnings: intakeContentWarnings(row.text),
    answer: answer
      ? {
          id: answer.id,
          text: answer.text,
          visibility: answer.visibility,
          publishedAt:
            answer.visibility === "public" ? answer.updatedAt.toISOString() : null
        }
      : null,
    recipient: {
      id: recipient?.id ?? null,
      recipientType: recipient?.recipientType ?? "ooof",
      opsNote: recipient?.opsNote ?? null,
      hasExternalContact: false
    }
  };
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const statusFilter =
    status && QUESTION_STATUSES.includes(status as QuestionStatus)
      ? (status as QuestionStatus)
      : undefined;
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from && !Number.isNaN(Date.parse(from))) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to && !Number.isNaN(Date.parse(to))) createdAt.lte = new Date(`${to}T23:59:59.999`);

  const questions = await prisma.question.findMany({
    where: {
      status: statusFilter,
      createdAt: createdAt.gte || createdAt.lte ? createdAt : undefined,
      OR: q
        ? [
            { text: { contains: q, mode: "insensitive" } },
            { exhibition: { title: { contains: q, mode: "insensitive" } } },
            { exhibition: { artist: { contains: q, mode: "insensitive" } } },
            { exhibition: { venue: { contains: q, mode: "insensitive" } } }
          ]
        : undefined
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({
    questions: questions.map((question) => present(question))
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const current = await prisma.question.findUnique({
    where: { id: parsed.data.id },
    include
  });
  if (!current) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (
    parsed.data.status &&
    parsed.data.status !== current.status &&
    !canOperatorSetStatus(current.status as QuestionStatus, parsed.data.status)
  ) {
    return NextResponse.json({ error: "이 상태로는 바꿀 수 없습니다." }, { status: 400 });
  }

  const recipient = current.recipients[0];
  if (recipient && (parsed.data.recipientType || parsed.data.opsNote !== undefined)) {
    await prisma.questionRecipient.update({
      where: { id: recipient.id },
      data: {
        recipientType: parsed.data.recipientType ?? recipient.recipientType,
        opsNote: parsed.data.opsNote !== undefined ? parsed.data.opsNote : recipient.opsNote,
        contactChannel: "ops"
      }
    });
  } else if (!recipient) {
    await prisma.questionRecipient.create({
      data: {
        question: { connect: { id: current.id } },
        recipientType: parsed.data.recipientType ?? "ooof",
        contactChannel: "ops",
        opsNote: parsed.data.opsNote ?? null
      }
    });
  }

  if (parsed.data.status) {
    await prisma.question.update({
      where: { id: current.id },
      data: { status: parsed.data.status }
    });
  }

  if (parsed.data.answerVisibility) {
    const visibilityResult = await setQuestionAnswerVisibility(
      current.id,
      parsed.data.answerVisibility
    );
    if ("error" in visibilityResult) {
      return NextResponse.json(
        { error: visibilityResult.error },
        { status: visibilityResult.status }
      );
    }
  }

  if (parsed.data.answerText) {
    const answered = await submitAdminQuestionAnswer(
      current.id,
      parsed.data.answerText,
      admin.id
    );
    if ("error" in answered) {
      return NextResponse.json({ error: answered.error }, { status: answered.status });
    }
  }

  let responseLink: {
    responseUrl: string;
    expiresAt: string;
  } | null = null;

  const shouldIssueToken =
    !parsed.data.answerText &&
    (parsed.data.issueToken === true || parsed.data.status === "sent");
  if (shouldIssueToken) {
    const origin = new URL(request.url).origin;
    const issued = await issueQuestionResponseToken(current.id, origin);
    if ("error" in issued) {
      return NextResponse.json({ error: issued.error }, { status: issued.status });
    }
    responseLink = {
      responseUrl: issued.responseUrl,
      expiresAt: issued.expiresAt
    };
  }

  await logEvent({
    type: "ARTIST_QUESTION_MODERATE",
    userId: admin.id,
    source: "admin_intake",
    metadata: {
      questionId: current.id,
      status: parsed.data.status ?? (shouldIssueToken ? "sent" : current.status),
      recipientType: parsed.data.recipientType ?? recipient?.recipientType ?? "ooof",
      issuedToken: Boolean(responseLink),
      answerVisibility: parsed.data.answerVisibility ?? null
    }
  });

  const next = await prisma.question.findUnique({
    where: { id: current.id },
    include
  });

  return NextResponse.json({
    question: next ? present(next) : null,
    responseLink
  });
}
