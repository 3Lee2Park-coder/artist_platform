import { getSession } from "@/lib/auth";
import { getAppUrl } from "@/lib/email";
import { logEvent } from "@/lib/events";
import { sendEmail } from "@/lib/email";
import { displayName } from "@/lib/nickname";
import { prisma } from "@/lib/prisma";
import { OPERATOR_UNLISTED_NAME } from "@/lib/question-topics";
import {
  assertQuestionQuota,
  getAdminRecipients,
  isQuestionTopic,
  sanitizeQuestionBody,
  validateQuestionBody
} from "@/lib/questions";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  kind: z.enum(["REGISTERED", "UNLISTED"]).optional(),
  topic: z.enum(["EXHIBITION", "ARTWORK", "VISIT"]),
  artistUserId: z.string().min(1).optional(),
  unlistedArtistName: z.string().max(40).optional(),
  exhibitionId: z.string().min(1).optional(),
  fromName: z.string().min(2).max(40).optional(),
  fromEmail: z.string().email().optional(),
  body: z.string()
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "로그인 후 질문을 남길 수 있습니다.", loginRequired: true },
      { status: 401 }
    );
  }

  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!isQuestionTopic(data.topic)) {
    return NextResponse.json(
      { error: "전시·작품·관람에 대한 질문만 받을 수 있습니다." },
      { status: 400 }
    );
  }

  const body = sanitizeQuestionBody(data.body);
  const bodyError = validateQuestionBody(body);
  if (bodyError) {
    return NextResponse.json({ error: bodyError }, { status: 400 });
  }

  const fromEmail = session.email.trim().toLowerCase();
  const fromName =
    data.fromName?.trim() ||
    displayName({ name: session.name, nickname: session.nickname }) ||
    "손님";
  const quotaError = await assertQuestionQuota(fromEmail);
  if (quotaError) {
    return NextResponse.json({ error: quotaError }, { status: 429 });
  }

  let kind = data.kind ?? (data.artistUserId ? "REGISTERED" : "UNLISTED");
  let artistUserId = data.artistUserId ?? null;
  let unlistedArtistName = data.unlistedArtistName?.trim() || null;

  if (kind === "REGISTERED") {
    if (!artistUserId) {
      kind = "UNLISTED";
      unlistedArtistName = unlistedArtistName || OPERATOR_UNLISTED_NAME;
    } else {
      const artist = await prisma.user.findUnique({
        where: { id: artistUserId },
        select: { id: true, artistStatus: true, name: true, nickname: true }
      });

      if (!artist || artist.artistStatus !== "APPROVED") {
        kind = "UNLISTED";
        unlistedArtistName =
          unlistedArtistName ||
          (artist ? displayName(artist) : null) ||
          OPERATOR_UNLISTED_NAME;
        artistUserId = null;
      }
    }
  }

  if (kind === "UNLISTED") {
    artistUserId = null;
    unlistedArtistName = unlistedArtistName || OPERATOR_UNLISTED_NAME;
  }

  if (data.exhibitionId) {
    const exhibition = await prisma.exhibition.findUnique({
      where: { id: data.exhibitionId },
      select: { id: true, status: true }
    });
    if (!exhibition || exhibition.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "연결된 전시를 찾을 수 없습니다." },
        { status: 400 }
      );
    }
  }

  const question = await prisma.artistQuestion.create({
    data: {
      kind,
      topic: data.topic,
      artistUserId,
      unlistedArtistName,
      exhibitionId: data.exhibitionId ?? null,
      fromUserId: session.id,
      fromName,
      fromEmail,
      body,
      status: "PENDING"
    }
  });

  await logEvent({
    type: "ARTIST_QUESTION_CREATE",
    userId: session.id,
    exhibitionId: data.exhibitionId ?? null,
    source: kind === "UNLISTED" ? "operator_inbox" : "walker",
    metadata: {
      questionId: question.id,
      topic: data.topic,
      artistUserId: artistUserId,
      operatorFallback: kind === "UNLISTED"
    }
  });

  const admins = await getAdminRecipients();
  const targetLabel =
    kind === "UNLISTED" ? unlistedArtistName : "등록 작가";
  await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: "[OOOF.] 작가 질문 검수가 필요합니다",
        text: `${fromName}님이 ${targetLabel}에게 질문을 남겼습니다.\n\n${body}\n\n${getAppUrl("/admin")}`,
        html: `<p>${fromName}님이 ${targetLabel}에게 질문을 남겼습니다.</p><p>${body}</p><p><a href="${getAppUrl("/admin")}">검수하기</a></p>`
      }).catch(() => undefined)
    )
  );

  return NextResponse.json({ ok: true, id: question.id }, { status: 201 });
}
