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

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "slug는 소문자·숫자·하이픈만 사용할 수 있습니다."),
  title: z.string().min(2),
  type: z.enum(PROGRAM_TYPES).default("OPEN_STUDIO"),
  spaceId: z.string().min(1),
  exhibitionId: z.string().optional().nullable(),
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
});

export async function GET() {
  const session = await getSession();
  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const programs = await prisma.program.findMany({
    where: {
      OR: [{ hostUserId: session.id }, { space: { ownerUserId: session.id } }]
    },
    include: {
      space: { select: { id: true, name: true, slug: true, status: true } }
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

  const space = await prisma.space.findFirst({
    where: { id: parsed.data.spaceId, ownerUserId: session.id }
  });

  if (!space) {
    return NextResponse.json(
      { error: "본인 소유의 공간에서만 프로그램을 등록할 수 있습니다." },
      { status: 403 }
    );
  }

  const existing = await prisma.program.findUnique({
    where: { slug: parsed.data.slug }
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 slug입니다. 제목을 조금 바꿔주세요." },
      { status: 409 }
    );
  }

  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json(
      { error: "종료일은 시작일 이후여야 합니다." },
      { status: 400 }
    );
  }

  const { schedule, exhibitionId, imageUrls, storyJson, ...rest } = parsed.data;
  const isAdmin = session.role === "ADMIN";

  const program = await prisma.program.create({
    data: {
      ...rest,
      exhibitionId: exhibitionId || null,
      summary: rest.summary || null,
      description: rest.description || null,
      heroImageUrl: rest.heroImageUrl || null,
      policyNote: rest.policyNote || null,
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
