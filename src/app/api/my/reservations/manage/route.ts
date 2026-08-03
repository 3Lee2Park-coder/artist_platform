import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const exhibitionId = searchParams.get("exhibitionId");

  const exhibitions = await prisma.exhibition.findMany({
    where: {
      registeredById: session.id,
      ...(exhibitionId ? { id: exhibitionId } : {})
    },
    select: { id: true, title: true }
  });

  const exhibitionIds = exhibitions.map((item) => item.id);

  if (exhibitionIds.length === 0) {
    return NextResponse.json({ reservations: [], slotSummary: [] });
  }

  const reservations = await prisma.reservation.findMany({
    where: { exhibitionId: { in: exhibitionIds } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      exhibition: { select: { id: true, title: true, venue: true, district: true } }
    },
    orderBy: [{ visitDate: "asc" }, { slot: "asc" }]
  });

  const slotSummaryMap = new Map<
    string,
    {
      exhibitionId: string;
      exhibitionTitle: string;
      visitDate: string;
      slot: string;
      count: number;
      reservations: typeof reservations;
    }
  >();

  for (const reservation of reservations) {
    if (!reservation.exhibitionId || !reservation.exhibition) continue;

    const key = `${reservation.exhibitionId}:${reservation.visitDate}:${reservation.slot}`;
    const existing = slotSummaryMap.get(key);

    if (existing) {
      existing.count += 1;
      existing.reservations.push(reservation);
    } else {
      slotSummaryMap.set(key, {
        exhibitionId: reservation.exhibitionId,
        exhibitionTitle: reservation.exhibition.title,
        visitDate: reservation.visitDate,
        slot: reservation.slot,
        count: 1,
        reservations: [reservation]
      });
    }
  }

  return NextResponse.json({
    reservations,
    slotSummary: Array.from(slotSummaryMap.values())
  });
}
