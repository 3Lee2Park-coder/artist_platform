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
      isActive: data.isActive ?? true
    }
  });

  return NextResponse.json({ place }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
  sourceUrl: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const { id, isActive, notes, sourceUrl, tags } = parsed.data;

  const place = await prisma.place.update({
    where: { id },
    data: {
      ...(typeof isActive === "boolean" ? { isActive } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl: sourceUrl || null } : {}),
      ...(tags ? { tags: JSON.stringify(tags) } : {})
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
