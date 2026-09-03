import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(40).optional(),
  subtitle: z.string().trim().max(80).optional().nullable(),
  makePublic: z.boolean().optional(),
  isPublic: z.boolean().optional()
});

type RouteContext = { params: Promise<{ id: string }> };

async function ownedDeck(userId: string, id: string) {
  return prisma.userDeck.findFirst({ where: { id, userId } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await ownedDeck(session.id, id);
  if (!existing) {
    return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const makePublic = parsed.data.makePublic ?? parsed.data.isPublic;
  const shareToken =
    makePublic === true
      ? existing.shareToken ?? crypto.randomUUID().replaceAll("-", "").slice(0, 16)
      : existing.shareToken;

  const deck = await prisma.userDeck.update({
    where: { id },
    data: {
      title: parsed.data.title ?? existing.title,
      subtitle: parsed.data.subtitle === undefined ? existing.subtitle : parsed.data.subtitle,
      isPublic: makePublic ?? existing.isPublic,
      shareToken
    }
  });

  return NextResponse.json({ deck });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await ownedDeck(session.id, id);
  if (!existing) {
    return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.userDeck.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
