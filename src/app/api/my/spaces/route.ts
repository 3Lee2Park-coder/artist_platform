import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

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
  region: z.string().default("서울"),
  district: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  floorOrUnit: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  storyJson: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  heroImageUrl: z.string().optional().nullable(),
  visitPolicy: z.enum(VISIT_POLICIES).default("HOURS"),
  visitNotice: z.string().optional().nullable(),
  openingHours: z.record(z.string(), z.string()).default({})
});

export async function GET() {
  const session = await getSession();
  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const spaces = await prisma.space.findMany({
    where: { ownerUserId: session.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { programs: true, exhibitions: true } } }
  });

  return NextResponse.json({ spaces });
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

  const existing = await prisma.space.findUnique({
    where: { slug: parsed.data.slug }
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 slug입니다. 이름을 조금 바꿔주세요." },
      { status: 409 }
    );
  }

  const count = await prisma.space.count({ where: { ownerUserId: session.id } });
  const { openingHours, imageUrls, storyJson, ...rest } = parsed.data;
  const isAdmin = session.role === "ADMIN";

  // 작가 등록 → DRAFT(검수 대기). 관리자 직접 등록 → 즉시 공개
  const space = await prisma.space.create({
    data: {
      ...rest,
      floorOrUnit: rest.floorOrUnit || null,
      shortDescription: rest.shortDescription || null,
      description: rest.description || null,
      heroImageUrl: rest.heroImageUrl || null,
      visitNotice: rest.visitNotice || null,
      openingHours: JSON.stringify(openingHours),
      imageUrls: JSON.stringify(imageUrls ?? []),
      storyJson: storyJson ?? "[]",
      ownerUserId: session.id,
      status: isAdmin ? "PUBLISHED" : "DRAFT",
      isPublic: isAdmin,
      sortOrder: isAdmin ? await prisma.space.count() : count
    }
  });

  return NextResponse.json({ space }, { status: 201 });
}
