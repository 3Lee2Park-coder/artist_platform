import { resolveApprovedArtistByEmail } from "@/lib/admin-ownership";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

const SPACE_TYPES = ["STUDIO", "SHOWROOM", "RESIDENCY", "SHARED_SPACE"] as const;
const VISIT_POLICIES = [
  "WALK_IN",
  "HOURS",
  "APPOINTMENT",
  "PROGRAM_ONLY",
  "CLOSED"
] as const;

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "slug는 소문자·숫자·하이픈만 사용할 수 있습니다."),
  name: z.string().min(2),
  type: z.enum(SPACE_TYPES).default("SHOWROOM"),
  ownerEmail: z.string().email().optional().nullable(),
  region: z.string().default("서울"),
  district: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  floorOrUnit: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  heroImageUrl: z.string().optional().nullable(),
  visitPolicy: z.enum(VISIT_POLICIES).default("HOURS"),
  visitNotice: z.string().optional().nullable(),
  openingHours: z.record(z.string(), z.string()).default({})
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const spaces = await prisma.space.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { exhibitions: true, programs: true } }
    }
  });

  return NextResponse.json({ spaces });
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

  const { ownerEmail, openingHours, ...rest } = parsed.data;

  let ownerUserId: string | null = null;
  if (ownerEmail) {
    const resolved = await resolveApprovedArtistByEmail(ownerEmail);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    ownerUserId = resolved.user.id;
  }

  const existing = await prisma.space.findUnique({ where: { slug: rest.slug } });
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 slug입니다." },
      { status: 409 }
    );
  }

  const count = await prisma.space.count();

  const space = await prisma.space.create({
    data: {
      ...rest,
      floorOrUnit: rest.floorOrUnit || null,
      shortDescription: rest.shortDescription || null,
      description: rest.description || null,
      heroImageUrl: rest.heroImageUrl || null,
      visitNotice: rest.visitNotice || null,
      openingHours: JSON.stringify(openingHours),
      ownerUserId,
      sortOrder: count
    }
  });

  return NextResponse.json({ space }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  type: z.enum(SPACE_TYPES).optional(),
  ownerEmail: z.string().email().nullable().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  floorOrUnit: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  visitPolicy: z.enum(VISIT_POLICIES).optional(),
  visitNotice: z.string().nullable().optional(),
  openingHours: z.record(z.string(), z.string()).optional(),
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

  const { id, ownerEmail, openingHours, ...rest } = parsed.data;

  let ownerUpdate: { ownerUserId: string | null } | Record<string, never> = {};
  if (ownerEmail !== undefined) {
    if (ownerEmail === null || ownerEmail === "") {
      ownerUpdate = { ownerUserId: null };
    } else {
      const resolved = await resolveApprovedArtistByEmail(ownerEmail);
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      ownerUpdate = { ownerUserId: resolved.user.id };
    }
  }

  const space = await prisma.space.update({
    where: { id },
    data: {
      ...rest,
      ...(openingHours ? { openingHours: JSON.stringify(openingHours) } : {}),
      ...ownerUpdate
    }
  });

  return NextResponse.json({ space });
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

  await prisma.space.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
