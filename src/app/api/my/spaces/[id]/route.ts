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

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(SPACE_TYPES).optional(),
  region: z.string().optional(),
  district: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  floorOrUnit: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  storyJson: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  heroImageUrl: z.string().optional().nullable(),
  visitPolicy: z.enum(VISIT_POLICIES).optional(),
  visitNotice: z.string().optional().nullable(),
  openingHours: z.record(z.string(), z.string()).optional()
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
  const space = await prisma.space.findUnique({ where: { id } });

  if (!space) {
    return NextResponse.json({ error: "공간을 찾을 수 없습니다." }, { status: 404 });
  }

  if (space.ownerUserId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { openingHours, imageUrls, storyJson, ...rest } = parsed.data;

  const updated = await prisma.space.update({
    where: { id },
    data: {
      ...rest,
      ...(openingHours !== undefined
        ? { openingHours: JSON.stringify(openingHours) }
        : {}),
      ...(imageUrls !== undefined
        ? { imageUrls: JSON.stringify(imageUrls) }
        : {}),
      ...(storyJson !== undefined ? { storyJson } : {})
    }
  });

  return NextResponse.json({ space: updated });
}
