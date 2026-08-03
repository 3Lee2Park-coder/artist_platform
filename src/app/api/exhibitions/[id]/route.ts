import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeReservationSchedule } from "@/lib/reservation-slots";
import { NextResponse } from "next/server";
import { z } from "zod";

const scheduleSchema = z.array(
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    slots: z
      .array(
        z.object({
          time: z.string().min(1),
          capacity: z.number().int().min(1).max(200)
        })
      )
      .min(1)
  })
);

const artworkUpdateSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  material: z.string().min(1),
  price: z.number().int().positive().optional().nullable(),
  imageTone: z.string().optional(),
  imageUrl: z.string().optional().nullable()
});

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  region: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  venue: z.string().min(1).optional(),
  address: z.string().min(5).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  categories: z.array(z.enum(["회화", "사진", "조각", "복합"])).optional(),
  exhibitionType: z
    .enum([
      "개인 대관형 전시",
      "갤러리 초대전/기획전 전시",
      "페어형 전시"
    ])
    .optional(),
  curationAvailable: z.boolean().optional(),
  summary: z.string().min(10).optional(),
  description: z.string().min(20).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reservable: z.boolean().optional(),
  todayOpen: z.boolean().optional(),
  heroImageUrl: z.string().optional(),
  artistVideoTitle: z.string().optional(),
  artistVideoDuration: z.string().optional(),
  artistVideoPosterTone: z.string().optional(),
  artistVideoUrl: z.string().optional(),
  reservationSchedule: scheduleSchema.optional(),
  reservationSlots: z.array(z.string()).optional(),
  artworks: z.array(artworkUpdateSchema).optional()
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await params;
  const exhibition = await prisma.exhibition.findUnique({ where: { id } });

  if (!exhibition) {
    return NextResponse.json({ error: "전시를 찾을 수 없습니다." }, { status: 404 });
  }

  if (exhibition.registeredById !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "본인 전시만 수정할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.artworks) {
    const existing = await prisma.artwork.findMany({
      where: { exhibitionId: id },
      select: { id: true }
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const keepIds = data.artworks
      .map((item) => item.id)
      .filter((item): item is string => Boolean(item) && existingIds.has(item));

    await prisma.artwork.deleteMany({
      where: {
        exhibitionId: id,
        ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {})
      }
    });

    for (const artwork of data.artworks) {
      const payload = {
        title: artwork.title,
        artist: exhibition.artist,
        material: artwork.material,
        price: artwork.price ?? null,
        imageTone:
          artwork.imageTone ??
          "linear-gradient(135deg, #e9d6c6 0%, #b67c65 100%)",
        imageUrl: artwork.imageUrl || null
      };

      if (artwork.id && existingIds.has(artwork.id)) {
        await prisma.artwork.update({
          where: { id: artwork.id },
          data: payload
        });
      } else {
        await prisma.artwork.create({
          data: {
            exhibitionId: id,
            ...payload
          }
        });
      }
    }
  }

  const updated = await prisma.exhibition.update({
    where: { id },
    data: {
      ...(data.title ? { title: data.title } : {}),
      ...(data.region ? { region: data.region } : {}),
      ...(data.district ? { district: data.district } : {}),
      ...(data.venue ? { venue: data.venue } : {}),
      ...(data.address ? { address: data.address } : {}),
      ...(data.lat !== undefined ? { lat: data.lat } : {}),
      ...(data.lng !== undefined ? { lng: data.lng } : {}),
      ...(data.categories ? { categories: JSON.stringify(data.categories) } : {}),
      ...(data.exhibitionType ? { exhibitionType: data.exhibitionType } : {}),
      ...(data.curationAvailable !== undefined
        ? { curationAvailable: data.curationAvailable }
        : {}),
      ...(data.summary ? { summary: data.summary } : {}),
      ...(data.description ? { description: data.description } : {}),
      ...(data.startDate ? { startDate: data.startDate } : {}),
      ...(data.endDate ? { endDate: data.endDate } : {}),
      ...(data.reservable !== undefined ? { reservable: data.reservable } : {}),
      ...(data.todayOpen !== undefined ? { todayOpen: data.todayOpen } : {}),
      ...(data.heroImageUrl ? { heroImageUrl: data.heroImageUrl } : {}),
      ...(data.artistVideoTitle !== undefined
        ? { artistVideoTitle: data.artistVideoTitle || null }
        : {}),
      ...(data.artistVideoDuration !== undefined
        ? { artistVideoDuration: data.artistVideoDuration || null }
        : {}),
      ...(data.artistVideoPosterTone !== undefined
        ? { artistVideoPosterTone: data.artistVideoPosterTone || null }
        : {}),
      ...(data.artistVideoUrl !== undefined
        ? {
            artistVideoUrl: data.artistVideoUrl || null,
            artistVideoStatus:
              data.artistVideoUrl || data.artistVideoTitle ? "ready" : null
          }
        : {}),
      ...(data.reservationSchedule !== undefined
        ? {
            reservationSlots: serializeReservationSchedule(data.reservationSchedule)
          }
        : data.reservationSlots !== undefined
          ? {
              reservationSlots: serializeReservationSchedule([
                {
                  date: null,
                  slots: data.reservationSlots.map((time) => ({
                    time,
                    capacity: 10
                  }))
                }
              ])
            }
          : {})
    },
    include: { artworks: true }
  });

  return NextResponse.json({ exhibition: updated });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const exhibition = await prisma.exhibition.findUnique({
    where: { id },
    include: { artworks: true }
  });

  if (!exhibition) {
    return NextResponse.json({ error: "전시를 찾을 수 없습니다." }, { status: 404 });
  }

  if (
    exhibition.registeredById !== session.id &&
    session.role !== "ADMIN" &&
    !isApprovedArtist(session)
  ) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({ exhibition });
}
