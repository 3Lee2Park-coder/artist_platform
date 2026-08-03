import { getSession, isApprovedArtist } from "@/lib/auth";
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
  spaceId: z.string().min(1).optional(),
  exhibitionId: z.string().optional().nullable(),
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
    include: { space: { select: { ownerUserId: true } } }
  });

  if (!program) {
    return NextResponse.json(
      { error: "프로그램을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const isOwner =
    program.hostUserId === session.id ||
    program.space.ownerUserId === session.id ||
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

  if (data.spaceId) {
    const space = await prisma.space.findFirst({
      where: { id: data.spaceId, ownerUserId: session.id }
    });
    if (!space && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "본인 소유의 공간으로만 변경할 수 있습니다." },
        { status: 403 }
      );
    }
  }

  const startDate = data.startDate ?? program.startDate;
  const endDate = data.endDate ?? program.endDate;
  if (endDate < startDate) {
    return NextResponse.json(
      { error: "종료일은 시작일 이후여야 합니다." },
      { status: 400 }
    );
  }

  const { schedule, imageUrls, storyJson, exhibitionId, ...rest } = data;

  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...rest,
      ...(exhibitionId !== undefined ? { exhibitionId: exhibitionId || null } : {}),
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
