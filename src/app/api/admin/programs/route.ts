import { resolveApprovedArtistByEmail } from "@/lib/admin-ownership";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeReservationSchedule } from "@/lib/reservation-slots";
import { NextResponse } from "next/server";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

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
  hostEmail: z.string().email().optional().nullable(),
  summary: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  heroImageUrl: z.string().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schedule: z.array(slotSchema).default([]),
  reservationRequired: z.boolean().default(true),
  policyNote: z.string().optional().nullable()
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const programs = await prisma.program.findMany({
    orderBy: [{ startDate: "asc" }],
    include: {
      space: { select: { id: true, name: true } },
      host: { select: { id: true, name: true, email: true } },
      _count: { select: { reservations: true } }
    }
  });

  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { hostEmail, schedule, exhibitionId, ...rest } = parsed.data;

  if (rest.endDate < rest.startDate) {
    return NextResponse.json(
      { error: "종료일은 시작일보다 빠를 수 없습니다." },
      { status: 400 }
    );
  }

  const space = await prisma.space.findUnique({ where: { id: rest.spaceId } });
  if (!space) {
    return NextResponse.json({ error: "공간을 찾을 수 없습니다." }, { status: 404 });
  }

  let hostUserId: string | null = null;
  if (hostEmail) {
    const resolved = await resolveApprovedArtistByEmail(hostEmail);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    hostUserId = resolved.user.id;
  }

  const existing = await prisma.program.findUnique({ where: { slug: rest.slug } });
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 slug입니다." },
      { status: 409 }
    );
  }

  const program = await prisma.program.create({
    data: {
      ...rest,
      exhibitionId: exhibitionId || null,
      summary: rest.summary || null,
      description: rest.description || null,
      heroImageUrl: rest.heroImageUrl || null,
      policyNote: rest.policyNote || null,
      reservationSlots: serializeReservationSchedule(schedule),
      hostUserId
    }
  });

  return NextResponse.json({ program }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).optional(),
  type: z.enum(PROGRAM_TYPES).optional(),
  hostEmail: z.string().email().nullable().optional(),
  summary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  schedule: z.array(slotSchema).optional(),
  reservationRequired: z.boolean().optional(),
  policyNote: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "HIDDEN"]).optional()
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const { id, schedule, hostEmail, ...rest } = parsed.data;

  let hostUpdate: { hostUserId: string | null } | Record<string, never> = {};
  if (hostEmail !== undefined) {
    if (hostEmail === null || hostEmail === "") {
      hostUpdate = { hostUserId: null };
    } else {
      const resolved = await resolveApprovedArtistByEmail(hostEmail);
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      hostUpdate = { hostUserId: resolved.user.id };
    }
  }

  const program = await prisma.program.update({
    where: { id },
    data: {
      ...rest,
      ...hostUpdate,
      ...(schedule
        ? { reservationSlots: serializeReservationSchedule(schedule) }
        : {})
    }
  });

  return NextResponse.json({ program });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  await prisma.program.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
