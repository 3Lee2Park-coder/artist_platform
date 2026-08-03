import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z
  .object({
    exhibitionId: z.string().min(1).optional(),
    spaceId: z.string().min(1).optional(),
    programId: z.string().min(1).optional()
  })
  .refine(
    (value) =>
      [value.exhibitionId, value.spaceId, value.programId].filter(Boolean)
        .length === 1,
    { message: "전시/공간/프로그램 중 하나만 지정해야 합니다." }
  );

// 다녀왔어요(방문 기록) 토글 — 전시·공간·프로그램에 자기 신고로 남긴다
export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { exhibitionId, spaceId, programId } = parsed.data;

  const existing = await prisma.visit.findFirst({
    where: {
      userId: session.id,
      ...(exhibitionId ? { exhibitionId } : {}),
      ...(spaceId ? { spaceId } : {}),
      ...(programId ? { programId } : {})
    }
  });

  if (existing) {
    await prisma.visit.delete({ where: { id: existing.id } });
    await logEvent({
      type: "VISIT_REMOVE",
      userId: session.id,
      exhibitionId: exhibitionId ?? undefined,
      source: "visit_toggle",
      metadata: { spaceId: spaceId ?? null, programId: programId ?? null }
    });
    return NextResponse.json({ visited: false });
  }

  await prisma.visit.create({
    data: {
      userId: session.id,
      exhibitionId: exhibitionId ?? null,
      spaceId: spaceId ?? null,
      programId: programId ?? null
    }
  });
  await logEvent({
    type: "VISIT_CREATE",
    userId: session.id,
    exhibitionId: exhibitionId ?? undefined,
    source: "visit_toggle",
    metadata: { spaceId: spaceId ?? null, programId: programId ?? null }
  });

  return NextResponse.json({ visited: true });
}
