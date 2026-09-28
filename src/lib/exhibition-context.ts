/**
 * 전시 상세의 「코스 / 근처」 맥락.
 * 덱에 들어 있으면 같은 코스 스톱을, 없으면 반경 내 전시·장소를 가볍게 붙인다.
 * 실패해도 상세 페이지는 그대로 렌더되도록 항상 빈 배열로 폴백한다.
 */
import { getTodayKST } from "@/lib/date";
import { distanceMeters, formatWalkDistance } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";

export type CourseCard = {
  id: string;
  title: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  coverTone: string;
  neighborhood: string | null;
  durationText: string | null;
  stopCount: number;
};

export type NearbyStopCard = {
  id: string;
  kind: "EXHIBITION" | "PLACE";
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
  tone: string | null;
  distanceText: string;
  badge: string | null;
};

export type ExhibitionCourseContext = {
  courses: CourseCard[];
  /** 같은 덱의 다른 스톱(현재 전시 제외). 없으면 근처 후보 */
  nextStops: NearbyStopCard[];
  source: "course" | "nearby" | "none";
};

const NEARBY_RADIUS_M = 1200;
const NEXT_LIMIT = 4;

function hasCoords(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

export async function getExhibitionCourseContext(
  exhibitionId: string,
  lat: number,
  lng: number
): Promise<ExhibitionCourseContext> {
  try {
    const courses = await loadCoursesForExhibition(exhibitionId);
    if (courses.length > 0) {
      const nextStops = await loadCourseStops(courses[0].id, exhibitionId);
      return {
        courses,
        nextStops: nextStops.slice(0, NEXT_LIMIT),
        source: nextStops.length ? "course" : "none"
      };
    }

    if (!hasCoords(lat, lng)) {
      return { courses: [], nextStops: [], source: "none" };
    }

    const nextStops = await loadNearbyStops(exhibitionId, lat, lng);
    return {
      courses: [],
      nextStops,
      source: nextStops.length ? "nearby" : "none"
    };
  } catch (error) {
    console.error("getExhibitionCourseContext", error);
    return { courses: [], nextStops: [], source: "none" };
  }
}

async function loadCoursesForExhibition(exhibitionId: string): Promise<CourseCard[]> {
  const rows = await prisma.curation.findMany({
    where: {
      published: true,
      OR: [
        { stops: { some: { exhibitionId } } },
        { exhibitions: { some: { exhibitionId } } }
      ]
    },
    select: {
      id: true,
      title: true,
      subtitle: true,
      coverImageUrl: true,
      coverTone: true,
      neighborhood: true,
      durationText: true,
      _count: { select: { stops: true, exhibitions: true } }
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    take: 3
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    coverImageUrl: resolveMediaUrl(row.coverImageUrl) ?? null,
    coverTone: row.coverTone,
    neighborhood: row.neighborhood,
    durationText: row.durationText,
    stopCount: Math.max(row._count.stops, row._count.exhibitions)
  }));
}

async function loadCourseStops(
  curationId: string,
  excludeExhibitionId: string
): Promise<NearbyStopCard[]> {
  const stops = await prisma.curationStop.findMany({
    where: { curationId },
    orderBy: { sortOrder: "asc" },
    include: {
      exhibition: {
        select: {
          id: true,
          title: true,
          artist: true,
          venue: true,
          status: true,
          heroImageUrl: true,
          heroTone: true
        }
      },
      place: {
        select: {
          id: true,
          name: true,
          type: true,
          imageUrl: true,
          isActive: true
        }
      },
      space: {
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          heroImageUrl: true,
          heroTone: true,
          status: true,
          isPublic: true
        }
      }
    }
  });

  const cards: NearbyStopCard[] = [];
  for (const stop of stops) {
    if (stop.stopType === "EXHIBITION" && stop.exhibition) {
      if (stop.exhibition.id === excludeExhibitionId) continue;
      if (stop.exhibition.status !== "PUBLISHED") continue;
      cards.push({
        id: `ex-${stop.exhibition.id}`,
        kind: "EXHIBITION",
        title: stop.exhibition.title,
        subtitle: stop.exhibition.venue,
        href: `/exhibitions/${stop.exhibition.id}`,
        imageUrl: resolveMediaUrl(stop.exhibition.heroImageUrl) ?? null,
        tone: stop.exhibition.heroTone,
        distanceText: stop.distanceText || "같은 코스",
        badge: stop.editorialBadge
      });
      continue;
    }
    if (stop.stopType === "PLACE" && stop.place?.isActive) {
      cards.push({
        id: `pl-${stop.place.id}`,
        kind: "PLACE",
        title: stop.place.name,
        subtitle: placeTypeLabel(stop.place.type),
        href: `/places/${stop.place.id}`,
        imageUrl: resolveMediaUrl(stop.place.imageUrl) ?? null,
        tone: null,
        distanceText: stop.distanceText || "같은 코스",
        badge: stop.editorialBadge
      });
      continue;
    }
    if (
      stop.stopType === "SPACE" &&
      stop.space &&
      stop.space.status === "PUBLISHED" &&
      stop.space.isPublic
    ) {
      cards.push({
        id: `sp-${stop.space.id}`,
        kind: "PLACE",
        title: stop.space.name,
        subtitle: stop.space.shortDescription,
        href: `/spaces/${stop.space.slug}`,
        imageUrl: resolveMediaUrl(stop.space.heroImageUrl) ?? null,
        tone: stop.space.heroTone,
        distanceText: stop.distanceText || "같은 코스",
        badge: stop.editorialBadge
      });
    }
  }
  return cards;
}

async function loadNearbyStops(
  excludeExhibitionId: string,
  lat: number,
  lng: number
): Promise<NearbyStopCard[]> {
  const today = getTodayKST();
  const [exhibitions, places] = await Promise.all([
    prisma.exhibition.findMany({
      where: {
        status: "PUBLISHED",
        endDate: { gte: today },
        id: { not: excludeExhibitionId }
      },
      select: {
        id: true,
        title: true,
        venue: true,
        heroImageUrl: true,
        heroTone: true,
        lat: true,
        lng: true
      },
      take: 250
    }),
    prisma.place.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        imageUrl: true,
        lat: true,
        lng: true
      },
      take: 250
    })
  ]);

  const scored: Array<NearbyStopCard & { meters: number }> = [];

  for (const item of exhibitions) {
    if (!hasCoords(item.lat, item.lng)) continue;
    const meters = distanceMeters({ lat, lng }, { lat: item.lat, lng: item.lng });
    if (meters > NEARBY_RADIUS_M) continue;
    scored.push({
      id: `ex-${item.id}`,
      kind: "EXHIBITION",
      title: item.title,
      subtitle: item.venue,
      href: `/exhibitions/${item.id}`,
      imageUrl: resolveMediaUrl(item.heroImageUrl) ?? null,
      tone: item.heroTone,
      distanceText: formatWalkDistance(meters),
      badge: null,
      meters
    });
  }

  for (const item of places) {
    if (!hasCoords(item.lat, item.lng)) continue;
    const meters = distanceMeters({ lat, lng }, { lat: item.lat, lng: item.lng });
    if (meters > NEARBY_RADIUS_M) continue;
    scored.push({
      id: `pl-${item.id}`,
      kind: "PLACE",
      title: item.name,
      subtitle: placeTypeLabel(item.type),
      href: `/places/${item.id}`,
      imageUrl: resolveMediaUrl(item.imageUrl) ?? null,
      tone: null,
      distanceText: formatWalkDistance(meters),
      badge: null,
      meters
    });
  }

  return scored
    .sort((a, b) => a.meters - b.meters)
    .slice(0, NEXT_LIMIT)
    .map(({ meters: _meters, ...card }) => card);
}

function placeTypeLabel(type: string) {
  if (type === "CAFE") return "카페";
  if (type === "RESTAURANT") return "식당";
  if (type === "WALK") return "산책";
  return "가볼 곳";
}
