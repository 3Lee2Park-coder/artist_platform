import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED"])
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      exhibition: { select: { registeredById: true } },
      program: { select: { hostUserId: true } }
    }
  });

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  const isOwner = reservation.userId === session.id;
  const isArtist =
    reservation.exhibition?.registeredById === session.id ||
    reservation.program?.hostUserId === session.id ||
    session.role === "ADMIN" ||
    session.role === "ARTIST";

  if (!isOwner && !isArtist) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (isOwner && !isArtist && parsed.data.status !== "CANCELLED") {
    return NextResponse.json(
      { error: "본인 예약은 취소만 가능합니다." },
      { status: 403 }
    );
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: parsed.data.status }
  });

  return NextResponse.json({ reservation: updated });
}
