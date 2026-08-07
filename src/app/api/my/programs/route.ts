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

const createSchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .regex(/^[a-z0-9-]+$/, "slug는 소문자·숫자·하이픈만 사용할 수 있습니다."),
    title: z.string().min(2),
    type: z.enum(PROGRAM_TYPES).default("OPEN_STUDIO"),
    spaceId: z.string().min(1).optional().nullable(),
    exhibitionId: z.string().min(1).optional().nullable(),
    summary: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    storyJson: z.string().optional(),
    imageUrls: z.array(z.string()).optional(),
    heroImageUrl: z.string().optional().nullable(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    schedule: z.array(slotSchema).default([]),
    reservationRequired: z.boolean().default(true),
    policyNote: z.string().optional().nullable()
  })
  .superRefine((data, ctx) => {
    if (!data.spaceId && !data.exhibitionId) {
      ctx.addIssue({
        code: "custom",
        message: "진행 공간 또는 전시를 선택해주세요.",
        path: ["spaceId"]
      });
    }
  });

export async function GET() {
  const session = await getSession();
  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { hostUserId: session.id },
        { space: { ownerUserId: session.id } },
        { exhibition: { registeredById: session.id } }
      ]
    },
    include: {
      space: { select: { id: true, name: true, slug: true, status: true } },
      exhibition: { select: { id: true, title: true, venue: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const isAdmin = session.role === "ADMIN";
  let spaceId: string | null = data.spaceId ?? null;
  let exhibitionId: string | null = data.exhibitionId ?? null;

  if (exhibitionId) {
    const today = getTodayKST();
    const exhibition = await prisma.exhibition.findFirst({
      where: isAdmin
        ? { id: exhibitionId }
        : { id: exhibitionId, registeredById: session.id },
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

    if (exhibition.status !== "PUBLISHED" && exhibition.status !== "DRAFT") {
      return NextResponse.json(
        { error: "공개·임시저장 상태의 전시에만 프로그램을 등록할 수 있습니다." },
        { status: 400 }
      );
    }

    if (exhibition.endDate < today) {
      return NextResponse.json(
        { error: "이미 종료된 전시에는 프로그램을 등록할 수 없습니다." },
        { status: 400 }
      );
    }

    const rangeError = programDatesWithinExhibition(
      data.startDate,
      data.endDate,
      exhibition
    );
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 400 });
    }

    // 전시 기반 등록: 작가 소유 공간이 연결된 경우만 spaceId를 붙인다.
    // 갤러리 등 타인 소유 공간이면 exhibitionId만으로 진행한다.
    if (exhibition.spaceId) {
      const ownedSpace = await prisma.space.findFirst({
        where: isAdmin
          ? { id: exhibition.spaceId }
          : { id: exhibition.spaceId, ownerUserId: session.id }
      });
      spaceId = ownedSpace ? exhibition.spaceId : null;
    } else {
      spaceId = null;
    }
  } else if (spaceId) {
    const space = await prisma.space.findFirst({
      where: isAdmin
        ? { id: spaceId }
        : { id: spaceId, ownerUserId: session.id }
    });
    if (!space) {
      return NextResponse.json(
        { error: "본인 소유의 공간에서만 프로그램을 등록할 수 있습니다." },
        { status: 403 }
      );
    }
  }

  const existing = await prisma.program.findUnique({
    where: { slug: data.slug }
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 slug입니다. 제목을 조금 바꿔주세요." },
      { status: 409 }
    );
  }

  if (data.endDate < data.startDate) {
    return NextResponse.json(
      { error: "종료일은 시작일 이후여야 합니다." },
      { status: 400 }
    );
  }

  for (const day of data.schedule) {
    if (day.date < data.startDate || day.date > data.endDate) {
      return NextResponse.json(
        { error: `예약일 ${day.date}이 프로그램 기간을 벗어납니다.` },
        { status: 400 }
      );
    }
  }

  const { schedule, imageUrls, storyJson, ...rest } = data;

  const program = await prisma.program.create({
    data: {
      slug: rest.slug,
      title: rest.title,
      type: rest.type,
      spaceId,
      exhibitionId,
      summary: rest.summary || null,
      description: rest.description || null,
      heroImageUrl: rest.heroImageUrl || null,
      policyNote: rest.policyNote || null,
      startDate: rest.startDate,
      endDate: rest.endDate,
      reservationRequired: rest.reservationRequired,
      reservationSlots: serializeReservationSchedule(schedule),
      imageUrls: JSON.stringify(imageUrls ?? []),
      storyJson: storyJson ?? "[]",
      hostUserId: session.id,
      status: isAdmin ? "PUBLISHED" : "DRAFT",
      isPublic: isAdmin
    }
  });

  return NextResponse.json({ program }, { status: 201 });
}
