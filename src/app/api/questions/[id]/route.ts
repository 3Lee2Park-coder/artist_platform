import { getSession } from "@/lib/auth";
import { getAppUrl, sendEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";
import { createNotice, NOTICE_TYPES } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const answerSchema = z.object({
  answer: z.string()
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true, artistStatus: true }
  });
  const canAnswer = Boolean(
    currentUser &&
      (currentUser.role === "ARTIST" ||
        currentUser.role === "GALLERY" ||
        currentUser.role === "ADMIN" ||
        currentUser.artistStatus === "APPROVED")
  );
  if (!canAnswer) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await params;
  const parsed = answerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const question = await prisma.artistQuestion.findUnique({
    where: { id }
  });

  if (!question || question.artistUserId !== session.id) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (question.status !== "APPROVED" && question.status !== "ANSWERED") {
    return NextResponse.json(
      { error: "아직 전달되지 않은 질문입니다." },
      { status: 400 }
    );
  }

  const answer = parsed.data.answer.trim();
  if (!answer) {
    return NextResponse.json({ error: "답변을 입력해 주세요." }, { status: 400 });
  }
  const updated = await prisma.artistQuestion.update({
    where: { id },
    data: {
      answer,
      status: "ANSWERED",
      answeredAt: new Date()
    }
  });

  await logEvent({
    type: "ARTIST_QUESTION_ANSWER",
    userId: session.id,
    exhibitionId: question.exhibitionId,
    source: "artist_inbox",
    metadata: { questionId: id }
  });

  if (question.fromUserId) {
    await createNotice({
      userId: question.fromUserId,
      type: NOTICE_TYPES.QUESTION_ANSWER,
      title: "질문에 답변이 도착했습니다",
      body: answer.slice(0, 180),
      href: "/my#inbox",
      dedupeKey: `answer:${id}`
    });
  }

  await sendEmail({
    to: question.fromEmail,
    subject: "[OOOF.] 작가의 답변이 도착했습니다",
    text: `질문: ${question.body}\n\n답변: ${updated.answer}\n\n${getAppUrl("/my#inbox")}`,
    html: `<p>질문</p><p>${question.body}</p><p>답변</p><p>${updated.answer}</p><p><a href="${getAppUrl("/my#inbox")}">질문 함에서 보기</a></p>`
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
