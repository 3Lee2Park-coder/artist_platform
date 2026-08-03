import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  exhibitionId: z.string().min(1),
  source: z.string().max(80).optional(),
  curationId: z.string().optional()
});

// 저장(찜) 토글
export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { exhibitionId, source, curationId } = parsed.data;
  const eventSource = source ?? "save_toggle";
  const metadata = curationId ? { curationId, from: "curation" } : undefined;
  const existing = await prisma.saveExhibition.findUnique({
    where: { userId_exhibitionId: { userId: session.id, exhibitionId } }
  });

  if (existing) {
    await prisma.saveExhibition.delete({ where: { id: existing.id } });
    await logEvent({
      type: "SAVE_REMOVE",
      userId: session.id,
      exhibitionId,
      source: eventSource,
      metadata
    });
    return NextResponse.json({ saved: false });
  }

  await prisma.saveExhibition.create({
    data: { userId: session.id, exhibitionId }
  });
  await logEvent({
    type: "SAVE_CREATE",
    userId: session.id,
    exhibitionId,
    source: eventSource,
    metadata
  });

  return NextResponse.json({ saved: true });
}
