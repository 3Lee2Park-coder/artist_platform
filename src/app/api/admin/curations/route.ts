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

const exhibitionLinkSchema = z.object({
  exhibitionId: z.string().min(1),
  editorialBadge: z.string().optional().nullable(),
  distanceText: z.string().optional().nullable()
});

// 순서 있는 동선 정차 지점 — 공간/전시/장소 중 정확히 하나를 가리킨다
const stopSchema = z.object({
  stopType: z.enum(["SPACE", "EXHIBITION", "PLACE"]),
  refId: z.string().min(1),
  editorialBadge: z.string().optional().nullable(),
  distanceText: z.string().optional().nullable(),
  note: z.string().optional().nullable()
});

type StopInput = z.infer<typeof stopSchema>;

function toStopData(stop: StopInput, curationId: string, sortOrder: number) {
  return {
    curationId,
    sortOrder,
    stopType: stop.stopType,
    spaceId: stop.stopType === "SPACE" ? stop.refId : null,
    exhibitionId: stop.stopType === "EXHIBITION" ? stop.refId : null,
    placeId: stop.stopType === "PLACE" ? stop.refId : null,
    editorialBadge: stop.editorialBadge || null,
    distanceText: stop.distanceText || null,
    note: stop.note || null
  };
}

async function validateStopRefs(stops: StopInput[]): Promise<string | null> {
  const spaceIds = stops
    .filter((stop) => stop.stopType === "SPACE")
    .map((stop) => stop.refId);
  const exhibitionIds = stops
    .filter((stop) => stop.stopType === "EXHIBITION")
    .map((stop) => stop.refId);
  const placeIds = stops
    .filter((stop) => stop.stopType === "PLACE")
    .map((stop) => stop.refId);

  const uniqueSpaceIds = [...new Set(spaceIds)];
  const uniqueExhibitionIds = [...new Set(exhibitionIds)];
  const uniquePlaceIds = [...new Set(placeIds)];

  const [spaces, exhibitionCount, placeCount] = await Promise.all([
    uniqueSpaceIds.length
      ? prisma.space.findMany({
          where: { id: { in: uniqueSpaceIds } },
          select: { id: true, status: true, isPublic: true }
        })
      : Promise.resolve([]),
    uniqueExhibitionIds.length
      ? prisma.exhibition.count({ where: { id: { in: uniqueExhibitionIds } } })
      : Promise.resolve(0),
    uniquePlaceIds.length
      ? prisma.place.count({
          where: { id: { in: uniquePlaceIds }, isActive: true }
        })
      : Promise.resolve(0)
  ]);

  if (spaces.length !== uniqueSpaceIds.length) {
    return "존재하지 않는 공간이 있습니다.";
  }
  if (spaces.some((space) => space.status !== "PUBLISHED" || !space.isPublic)) {
    return "비공개 공간은 큐레이션 동선에 넣을 수 없습니다. 먼저 공개해 주세요.";
  }
  if (exhibitionCount !== uniqueExhibitionIds.length) {
    return "존재하지 않는 전시가 있습니다.";
  }
  if (placeCount !== uniquePlaceIds.length) {
    return "존재하지 않거나 비활성 장소가 있습니다.";
  }
  return null;
}

const createSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  storyJson: z.string().optional(),
  descriptionImages: z.array(z.string()).optional(),
  coverTone: z.string().optional(),
  coverImageUrl: z.string().optional().nullable(),
  neighborhood: z.string().optional(),
  situationTags: z.array(z.string()).default([]),
  basePlaceId: z.string().optional().nullable(),
  radiusMeters: z.number().int().min(100).max(5000).default(800),
  durationText: z.string().optional(),
  featured: z.boolean().optional(),
  exhibitionIds: z.array(z.string()).default([]),
  exhibitions: z.array(exhibitionLinkSchema).optional(),
  stops: z.array(stopSchema).optional()
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const curations = await prisma.curation.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      basePlace: true,
      exhibitions: {
        orderBy: { sortOrder: "asc" },
        include: { exhibition: { select: { title: true } } }
      }
    }
  });

  return NextResponse.json({ curations });
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

  const {
    title,
    subtitle,
    description,
    storyJson,
    descriptionImages,
    coverTone,
    coverImageUrl,
    neighborhood,
    situationTags,
    basePlaceId,
    radiusMeters,
    durationText,
    featured,
    exhibitionIds,
    exhibitions,
    stops
  } = parsed.data;

  // stops가 있으면 stop 기반, 없으면 레거시 전시 링크 기반
  const links =
    exhibitions && exhibitions.length > 0
      ? exhibitions
      : exhibitionIds.map((exhibitionId) => ({
          exhibitionId,
          editorialBadge: null as string | null,
          distanceText: null as string | null
        }));

  if (stops && stops.length > 0) {
    const refError = await validateStopRefs(stops);
    if (refError) {
      return NextResponse.json({ error: refError }, { status: 400 });
    }
  }

  // 하위 호환 — stop 기반 생성 시에도 전시형 stop은 CurationExhibition에 반영
  const exhibitionLinks =
    stops && stops.length > 0
      ? stops
          .filter((stop) => stop.stopType === "EXHIBITION")
          .map((stop) => ({
            exhibitionId: stop.refId,
            editorialBadge: stop.editorialBadge ?? null,
            distanceText: stop.distanceText ?? null
          }))
      : links;

  const count = await prisma.curation.count();
  const isFeatured = featured ?? false;

  if (isFeatured) {
    await prisma.curation.updateMany({ data: { featured: false } });
  }

  const curation = await prisma.curation.create({
    data: {
      title,
      subtitle: subtitle || null,
      description: description || null,
      storyJson: storyJson ?? "[]",
      descriptionImages: JSON.stringify(descriptionImages ?? []),
      coverTone: coverTone || undefined,
      coverImageUrl: coverImageUrl || null,
      neighborhood: neighborhood || null,
      situationTags: JSON.stringify(situationTags),
      basePlaceId: basePlaceId || null,
      radiusMeters,
      durationText: durationText || null,
      featured: isFeatured,
      sortOrder: count,
      createdById: admin.id,
      exhibitions: {
        create: exhibitionLinks.map((link, index) => ({
          exhibitionId: link.exhibitionId,
          sortOrder: index,
          editorialBadge: link.editorialBadge || null,
          distanceText: link.distanceText || null
        }))
      }
    }
  });

  if (stops && stops.length > 0) {
    await prisma.curationStop.createMany({
      data: stops.map((stop, index) => toStopData(stop, curation.id, index))
    });
  }

  if (basePlaceId) {
    await prisma.place.update({
      where: { id: basePlaceId },
      data: {
        usedCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });
  }

  return NextResponse.json({ curation }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  published: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  storyJson: z.string().optional(),
  descriptionImages: z.array(z.string()).optional(),
  coverImageUrl: z.string().optional().nullable(),
  exhibitionIds: z.array(z.string()).optional(),
  exhibitions: z.array(exhibitionLinkSchema).optional(),
  stops: z.array(stopSchema).optional(),
  basePlaceId: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  situationTags: z.array(z.string()).optional(),
  radiusMeters: z.number().int().optional(),
  durationText: z.string().optional().nullable(),
  featured: z.boolean().optional()
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

  const {
    id,
    published,
    title,
    subtitle,
    description,
    storyJson,
    descriptionImages,
    coverImageUrl,
    exhibitionIds,
    exhibitions,
    stops,
    basePlaceId,
    neighborhood,
    situationTags,
    radiusMeters,
    durationText,
    featured
  } = parsed.data;

  // featured를 true로 켜면 다른 큐레이션은 히어로 후보에서 내려 한 개만 강조
  if (featured === true) {
    await prisma.curation.updateMany({
      where: { NOT: { id } },
      data: { featured: false }
    });
  }

  await prisma.curation.update({
    where: { id },
    data: {
      ...(typeof published === "boolean" ? { published } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(subtitle !== undefined ? { subtitle } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(storyJson !== undefined ? { storyJson } : {}),
      ...(descriptionImages !== undefined
        ? { descriptionImages: JSON.stringify(descriptionImages) }
        : {}),
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      ...(basePlaceId !== undefined ? { basePlaceId } : {}),
      ...(neighborhood !== undefined ? { neighborhood } : {}),
      ...(situationTags ? { situationTags: JSON.stringify(situationTags) } : {}),
      ...(typeof radiusMeters === "number" ? { radiusMeters } : {}),
      ...(durationText !== undefined ? { durationText } : {}),
      ...(typeof featured === "boolean" ? { featured } : {})
    }
  });

  const links =
    exhibitions ??
    (exhibitionIds
      ? exhibitionIds.map((exhibitionId) => ({
          exhibitionId,
          editorialBadge: null as string | null,
          distanceText: null as string | null
        }))
      : null);

  if (stops) {
    const refError = await validateStopRefs(stops);
    if (refError) {
      return NextResponse.json({ error: refError }, { status: 400 });
    }

    await prisma.curationStop.deleteMany({ where: { curationId: id } });
    if (stops.length > 0) {
      await prisma.curationStop.createMany({
        data: stops.map((stop, index) => toStopData(stop, id, index))
      });
    }

    // 전시형 stop을 레거시 링크에도 동기화
    await prisma.curationExhibition.deleteMany({ where: { curationId: id } });
    const exhibitionStops = stops.filter((stop) => stop.stopType === "EXHIBITION");
    if (exhibitionStops.length > 0) {
      await prisma.curationExhibition.createMany({
        data: exhibitionStops.map((stop, index) => ({
          curationId: id,
          exhibitionId: stop.refId,
          sortOrder: index,
          editorialBadge: stop.editorialBadge || null,
          distanceText: stop.distanceText || null
        }))
      });
    }
  } else if (links) {
    await prisma.curationExhibition.deleteMany({ where: { curationId: id } });
    await prisma.curationExhibition.createMany({
      data: links.map((link, index) => ({
        curationId: id,
        exhibitionId: link.exhibitionId,
        sortOrder: index,
        editorialBadge: link.editorialBadge || null,
        distanceText: link.distanceText || null
      }))
    });
  }

  return NextResponse.json({ ok: true });
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

  await prisma.curation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
