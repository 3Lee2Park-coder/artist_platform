import { getSession } from "@/lib/auth";
import { getAppUrl, sendEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";
import { displayName } from "@/lib/nickname";
import { createNotice, NOTICE_TYPES } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "forward", "answer"]),
  adminNote: z.string().max(400).optional(),
  answer: z.string().optional()
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const questions = await prisma.artistQuestion.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      artist: { select: { id: true, name: true, nickname: true, email: true } },
      exhibition: { select: { id: true, title: true } }
    }
  });

  return NextResponse.json({ questions });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const question = await prisma.artistQuestion.findUnique({
    where: { id: parsed.data.id },
    include: {
      artist: { select: { id: true, name: true, nickname: true, email: true, notifyEmail: true } }
    }
  });

  if (!question) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (parsed.data.action === "approve") {
    if (question.kind !== "REGISTERED" || !question.artistUserId) {
      return NextResponse.json(
        { error: "미등록·미연결 작가는 전달 대신 운영이 답하거나 전달 표시를 해 주세요." },
        { status: 400 }
      );
    }

    await prisma.artistQuestion.update({
      where: { id: question.id },
      data: { status: "APPROVED", adminNote: parsed.data.adminNote ?? question.adminNote }
    });

    await createNotice({
      userId: question.artistUserId,
      type: NOTICE_TYPES.QUESTION_RECEIVED,
      title: "관객의 질문이 도착했습니다",
      body: question.body.slice(0, 180),
      href: "/my?view=artist#received-questions",
      dedupeKey: `received:${question.id}`
    });

    if (question.artist?.email && question.artist.notifyEmail !== false) {
      await sendEmail({
        to: question.artist.email,
        subject: "[OOOF.] 관객의 질문이 도착했습니다",
        text: `${displayName({ name: question.artist.name, nickname: question.artist.nickname })}님, 답변을 기다리는 관람객 질문이 있습니다.\n\n${question.body}\n\n${getAppUrl("/my?view=artist#received-questions")}`,
        html: `<p>답변을 기다리는 관람객 질문이 있습니다.</p><p>${question.body}</p><p><a href="${getAppUrl("/my?view=artist#received-questions")}">질문 확인하고 답변하기</a></p>`
      }).catch(() => undefined);
    }
  } else if (parsed.data.action === "reject") {
    await prisma.artistQuestion.update({
      where: { id: question.id },
      data: { status: "REJECTED", adminNote: parsed.data.adminNote ?? "반려" }
    });

    if (question.fromUserId) {
      await createNotice({
        userId: question.fromUserId,
        type: NOTICE_TYPES.QUESTION_REJECTED,
        title: "질문은 전달되지 않았습니다",
        body: "전시·작품과 관련이 적거나 전달할 수 없는 내용으로 판단했습니다.",
        href: "/my#inbox",
        dedupeKey: `reject:${question.id}`
      });
    }
  } else if (parsed.data.action === "forward") {
    await prisma.artistQuestion.update({
      where: { id: question.id },
      data: { status: "FORWARDED", adminNote: parsed.data.adminNote ?? "작가에게 전달 중" }
    });
  } else {
    const answer = parsed.data.answer?.trim();
    if (!answer) {
      return NextResponse.json({ error: "답변을 입력해 주세요." }, { status: 400 });
    }

    await prisma.artistQuestion.update({
      where: { id: question.id },
      data: {
        status: "ANSWERED",
        answer,
        answeredAt: new Date(),
        adminNote: parsed.data.adminNote ?? question.adminNote
      }
    });

    if (question.fromUserId) {
      await createNotice({
        userId: question.fromUserId,
        type: NOTICE_TYPES.QUESTION_ANSWER,
        title: "질문에 답변이 도착했습니다",
        body: answer.slice(0, 180),
        href: "/my#inbox",
        dedupeKey: `answer:${question.id}`
      });
    }

    await sendEmail({
      to: question.fromEmail,
      subject: "[OOOF.] 질문에 대한 답변이 도착했습니다",
      text: `질문: ${question.body}\n\n답변: ${answer}\n\n${getAppUrl("/my#inbox")}`,
      html: `<p>질문</p><p>${question.body}</p><p>답변</p><p>${answer}</p><p><a href="${getAppUrl("/my#inbox")}">질문 함에서 보기</a></p>`
    }).catch(() => undefined);
  }

  await logEvent({
    type: "ARTIST_QUESTION_MODERATE",
    userId: admin.id,
    source: "admin",
    metadata: { questionId: question.id, action: parsed.data.action }
  });

  return NextResponse.json({ ok: true });
}
