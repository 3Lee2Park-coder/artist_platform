import { getSession, isApprovedArtist } from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();

  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const exhibitions = await prisma.exhibition.findMany({
    where: { registeredById: session.id },
    include: {
      artworks: true,
      _count: { select: { reservations: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ exhibitions });
}
