import { getSession, isApprovedArtist } from "@/lib/auth";
import { slugify } from "@/lib/date";
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

const artworkSchema = z.object({
  title: z.string().min(1),
  material: z.string().min(1),
  price: z.number().int().positive().optional(),
  imageTone: z.string().optional(),
  imageUrl: z.string().url().optional()
});

const exhibitionSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/, "ID는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.")
    .optional(),
  title: z.string().min(2),
  artist: z.string().min(2),
  region: z.string().min(1),
  district: z.string().min(1),
  venue: z.string().min(1),
  address: z.string().min(5),
  lat: z.number(),
  lng: z.number(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categories: z.array(z.enum(["회화", "사진", "조각", "복합"])).min(1),
  exhibitionType: z.enum([
    "개인 대관형 전시",
    "갤러리 초대전/기획전 전시",
    "페어형 전시"
  ]),
  curationAvailable: z.boolean(),
  reservable: z.boolean(),
  todayOpen: z.boolean().optional(),
  popular: z.boolean().optional(),
  nearby: z.boolean().optional(),
  heroTone: z.string().optional(),
  heroImageUrl: z.string().url().optional(),
  summary: z.string().min(10),
  description: z.string().min(20),
  descriptionImages: z.array(z.string().url()).optional(),
  reservationSchedule: scheduleSchema.optional(),
  reservationSlots: z.array(z.string()).optional(),
  artistVideoTitle: z.string().optional(),
  artistVideoDuration: z.string().optional(),
  artistVideoPosterTone: z.string().optional(),
  artistVideoUrl: z.string().url().optional(),
  artworks: z.array(artworkSchema).default([])
});

async function createUniqueExhibitionId(title: string, requestedId?: string) {
  const base = slugify(requestedId || title) || `exhibition-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (await prisma.exhibition.findUnique({ where: { id: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isApprovedArtist(session)) {
    return NextResponse.json(
      { error: "승인된 작가만 전시를 등록할 수 있습니다." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = exhibitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.endDate < data.startDate) {
      return NextResponse.json(
        { error: "종료일은 시작일 이후여야 합니다." },
        { status: 400 }
      );
    }

    const exhibitionId = await createUniqueExhibitionId(data.title, data.id);

    const exhibition = await prisma.exhibition.create({
      data: {
        id: exhibitionId,
        title: data.title,
        artist: data.artist,
        registeredById: session.id,
        region: data.region,
        district: data.district,
        venue: data.venue,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        startDate: data.startDate,
        endDate: data.endDate,
        categories: JSON.stringify(data.categories),
        exhibitionType: data.exhibitionType,
        curationAvailable: data.curationAvailable,
        reservable: data.reservable,
        todayOpen: data.todayOpen ?? true,
        popular: data.popular ?? false,
        nearby: data.nearby ?? false,
        heroTone:
          data.heroTone ??
          "linear-gradient(135deg, #efe6da 0%, #b8c5c0 48%, #4c4b45 100%)",
        heroImageUrl: data.heroImageUrl,
        summary: data.summary,
        description: data.description,
        descriptionImages: JSON.stringify(data.descriptionImages ?? []),
        source: session.role === "ADMIN" ? "ADMIN" : "ARTIST",
        reservationSlots:
          data.reservationSchedule !== undefined
            ? serializeReservationSchedule(data.reservationSchedule)
            : JSON.stringify(
                (data.reservationSlots ?? []).map((time) => ({
                  date: null,
                  slots: [{ time, capacity: 10 }]
                }))
              ),
        artistVideoTitle: data.artistVideoTitle,
        artistVideoDuration: data.artistVideoDuration,
        artistVideoPosterTone: data.artistVideoPosterTone,
        artistVideoUrl: data.artistVideoUrl,
        artistVideoStatus: data.artistVideoUrl || data.artistVideoTitle ? "ready" : null,
        status: "PUBLISHED",
        ...(data.artworks.length > 0
          ? {
              artworks: {
                create: data.artworks.map((artwork) => ({
                  title: artwork.title,
                  artist: data.artist,
                  material: artwork.material,
                  price: artwork.price ?? null,
                  imageTone:
                    artwork.imageTone ??
                    "linear-gradient(135deg, #e9d6c6 0%, #b67c65 100%)",
                  imageUrl: artwork.imageUrl ?? null
                }))
              }
            }
          : {})
      },
      include: { artworks: true }
    });

    return NextResponse.json({ exhibition }, { status: 201 });
  } catch (error) {
    console.error("Exhibition create error:", error);
    return NextResponse.json(
      { error: "전시 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const exhibitions = await prisma.exhibition.findMany({
    where: { status: "PUBLISHED" },
    include: { artworks: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ exhibitions });
}
