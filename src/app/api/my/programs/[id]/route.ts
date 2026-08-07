import { getSession, isApprovedArtist } from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import { programDatesWithinExhibition } from "@/lib/programs";
import { prisma } from "@/lib/prisma";
import { serializeReservationSchedule } from "@/lib/reservation-slots";
import { NextResponse } from "next/server";
import { z } from "zod";

const PROGRAM_TYPES = ["OPEN_STUDIO", "ARTIST_TALK", "WORKSHOP", "TOUR"] as const;

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(
    z.object({
      time: z.string().min(1),
      capacity: z.number().int().min(1).max(200)
    })
  )
});

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  type: z.enum(PROGRAM_TYPES).optional(),
  spaceId: z.string().min(1).optional().nullable(),
  exhibitionId: z.string().min(1).optional().nullable(),
  summary: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  storyJson: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  heroImageUrl: z.string().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  schedule: z.array(slotSchema).optional(),
  reservationRequired: z.boolean().optional(),
  policyNote: z.string().optional().nullable()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await context.params;
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      space: { select: { ownerUserId: true } },
      exhibition: { select: { registeredById: true } }
    }
  });

  if (!program) {
    return NextResponse.json(
      { error: "프로그램을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const isOwner =
    program.hostUserId === session.id ||
    program.space?.ownerUserId === session.id ||
    program.exhibition?.registeredById === session.id ||
    session.role === "ADMIN";

  if (!isOwner) {
    return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const isAdmin = session.role === "ADMIN";
  let nextSpaceId =
    data.spaceId !== undefined ? data.spaceId : program.spaceId;
  let nextExhibitionId =
    data.exhibitionId !== undefined ? data.exhibitionId : program.exhibitionId;

  if (!nextSpaceId && !nextExhibitionId) {
    return NextResponse.json(
      { error: "진행 공간 또는 전시가 필요합니다." },
      { status: 400 }
    );
  }

  const startDate = data.startDate ?? program.startDate;
  const endDate = data.endDate ?? program.endDate;
  if (endDate < startDate) {
    return NextResponse.json(
      { error: "종료일은 시작일 이후여야 합니다." },
      { status: 400 }
    );
  }

  if (nextExhibitionId) {
    const today = getTodayKST();
    const exhibition = await prisma.exhibition.findFirst({
      where: isAdmin
        ? { id: nextExhibitionId }
        : { id: nextExhibitionId, registeredById: session.id },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        status: true,
        spaceId: true,
        source: true
      }
    });

    if (!exhibition) {
      return NextResponse.json(
        { error: "본인이 등록한 전시에서만 프로그램을 열 수 있습니다." },
        { status: 403 }
      );
    }

    if (exhibition.source === "PUBLIC_API") {
      return NextResponse.json(
        { error: "공공 API 전시에는 프로그램을 연결할 수 없습니다." },
        { status: 400 }
      );
    }

    if (exhibition.endDate < today && endDate > exhibition.endDate) {
      return NextResponse.json(
        { error: "이미 종료된 전시 기간을 벗어날 수 없습니다." },
        { status: 400 }
      );
    }

    const rangeError = programDatesWithinExhibition(startDate, endDate, exhibition);
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 400 });
    }

    if (exhibition.spaceId) {
      const ownedSpace = await prisma.space.findFirst({
        where: isAdmin
          ? { id: exhibition.spaceId }
          : { id: exhibition.spaceId, ownerUserId: session.id }
      });
      nextSpaceId = ownedSpace ? exhibition.spaceId : null;
    } else {
      nextSpaceId = null;
    }
  } else if (data.spaceId) {
    const space = await prisma.space.findFirst({
      where: isAdmin
        ? { id: data.spaceId }
        : { id: data.spaceId, ownerUserId: session.id }
    });
    if (!space) {
      return NextResponse.json(
        { error: "본인 소유의 공간으로만 변경할 수 있습니다." },
        { status: 403 }
      );
    }
  }

  if (data.schedule) {
    for (const day of data.schedule) {
      if (day.date < startDate || day.date > endDate) {
        return NextResponse.json(
          { error: `예약일 ${day.date}이 프로그램 기간을 벗어납니다.` },
          { status: 400 }
        );
      }
    }
  }

  const { schedule, imageUrls, storyJson, spaceId, exhibitionId, ...rest } = data;

  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...rest,
      spaceId: nextSpaceId,
      exhibitionId: nextExhibitionId,
      ...(schedule !== undefined
        ? { reservationSlots: serializeReservationSchedule(schedule) }
        : {}),
      ...(imageUrls !== undefined
        ? { imageUrls: JSON.stringify(imageUrls) }
        : {}),
      ...(storyJson !== undefined ? { storyJson } : {})
    }
  });

  return NextResponse.json({ program: updated });
}
