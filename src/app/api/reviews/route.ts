import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { REVIEW_MOOD_TAGS } from "@/lib/taste";
import { NextResponse } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({
  exhibitionId: z.string().min(1),
  recommend: z.boolean(),
  moodTags: z.array(z.enum(REVIEW_MOOD_TAGS)).optional(),
  memo: z.string().max(1000).optional()
});

// 리뷰 작성/수정 (전시당 1개, upsert). 작성 시 방문 기록도 자동 생성.
export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = reviewSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const { exhibitionId, recommend, moodTags, memo } = parsed.data;

  const review = await prisma.review.upsert({
    where: { userId_exhibitionId: { userId: session.id, exhibitionId } },
    update: {
      recommend,
      moodTags: JSON.stringify(moodTags ?? []),
      memo: memo?.trim() || null
    },
    create: {
      userId: session.id,
      exhibitionId,
      recommend,
      moodTags: JSON.stringify(moodTags ?? []),
      memo: memo?.trim() || null
    }
  });

  // 리뷰를 남겼다면 방문한 것으로 간주
  await prisma.visit.upsert({
    where: { userId_exhibitionId: { userId: session.id, exhibitionId } },
    update: {},
    create: { userId: session.id, exhibitionId }
  });
  await logEvent({
    type: "REVIEW_UPSERT",
    userId: session.id,
    exhibitionId,
    source: "review_panel",
    metadata: {
      recommend,
      moodTagCount: moodTags?.length ?? 0,
      hasMemo: Boolean(memo?.trim())
    }
  });

  return NextResponse.json({ review });
}

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const exhibitionId = searchParams.get("exhibitionId");

  if (!exhibitionId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  await prisma.review.deleteMany({
    where: { userId: session.id, exhibitionId }
  });
  await logEvent({
    type: "REVIEW_DELETE",
    userId: session.id,
    exhibitionId,
    source: "review_panel"
  });

  return NextResponse.json({ ok: true });
}
