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

const placeSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CAFE", "RESTAURANT", "WALK", "ETC"]).default("CAFE"),
  region: z.string().default("서울"),
  district: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  tags: z.array(z.string()).default([]),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
  editorialNote: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  homeFeatured: z.boolean().optional(),
  homeSortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const district = searchParams.get("district");
  const activeOnly = searchParams.get("active") !== "0";

  const places = await prisma.place.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(district ? { district } : {})
    },
    orderBy: [{ district: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({
    places: places.map((place) => ({
      ...place,
      tags: JSON.parse(place.tags || "[]") as string[]
    }))
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = placeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const place = await prisma.place.create({
    data: {
      name: data.name,
      type: data.type,
      region: data.region,
      district: data.district,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      tags: JSON.stringify(data.tags),
      sourceUrl: data.sourceUrl || null,
      notes: data.notes || null,
      editorialNote: data.editorialNote || null,
      imageUrl: data.imageUrl || null,
      homeFeatured: data.homeFeatured ?? false,
      homeSortOrder: data.homeSortOrder ?? 0,
      isActive: data.isActive ?? true
    }
  });

  return NextResponse.json({ place }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  type: z.enum(["CAFE", "RESTAURANT", "WALK", "ETC"]).optional(),
  region: z.string().optional(),
  district: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  tags: z.array(z.string()).optional(),
  sourceUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  editorialNote: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  homeFeatured: z.boolean().optional(),
  homeSortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { id, tags, sourceUrl, notes, editorialNote, imageUrl, ...rest } =
    parsed.data;

  const place = await prisma.place.update({
    where: { id },
    data: {
      ...rest,
      ...(tags ? { tags: JSON.stringify(tags) } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl: sourceUrl || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(editorialNote !== undefined ? { editorialNote: editorialNote || null } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {})
    }
  });

  return NextResponse.json({ place });
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

  await prisma.place.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
