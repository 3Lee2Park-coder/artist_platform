import { getTodayKST } from "@/lib/date";
import { distanceMeters, formatWalkDistance } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";

export const PLACE_TYPE_LABEL: Record<string, string> = {
  CAFE: "카페",
  RESTAURANT: "식당",
  WALK: "산책",
  ETC: "가볼 곳"
};

export const PLACE_TIP_SITUATION_LABEL: Record<string, string> = {
  BEFORE: "전시 전에",
  AFTER: "전시 보고 나서",
  SOLO: "혼자",
  DATE: "데이트",
  MEAL: "식사",
  OTHER: "기타"
};

export type NearbyExhibitionCard = {
  id: string;
  title: string;
  artist: string;
  venue: string;
  region: string;
  district: string;
  startDate: string;
  endDate: string;
  heroTone: string;
  heroImageUrl: string | null;
  distanceText: string;
};

export type PlaceCurationCard = {
  id: string;
  title: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  coverTone: string;
  neighborhood: string | null;
  durationText: string | null;
};

export type PlaceCard = {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  region: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  sourceUrl: string | null;
  notes: string | null;
  editorialNote: string | null;
  imageUrl: string | null;
  homeFeatured: boolean;
  homeSortOrder: number;
  nearbyExhibition: {
    id: string;
    title: string;
    venue: string;
    distanceText: string;
  } | null;
};

function toPlaceCard(
  place: {
    id: string;
    name: string;
    type: string;
    region: string;
    district: string;
    address: string;
    lat: number;
    lng: number;
    sourceUrl: string | null;
    notes: string | null;
    editorialNote: string | null;
    imageUrl: string | null;
    homeFeatured: boolean;
    homeSortOrder: number;
  },
  nearbyExhibition: PlaceCard["nearbyExhibition"] = null
): PlaceCard {
  return {
    id: place.id,
    name: place.name,
    type: place.type,
    typeLabel: PLACE_TYPE_LABEL[place.type] ?? place.type,
    region: place.region,
    district: place.district,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    sourceUrl: place.sourceUrl,
    notes: place.notes,
    editorialNote: place.editorialNote,
    imageUrl: resolveMediaUrl(place.imageUrl) ?? null,
    homeFeatured: place.homeFeatured,
    homeSortOrder: place.homeSortOrder,
    nearbyExhibition
  };
}

async function findNearbyExhibitions(
  lat: number,
  lng: number,
  limit = 3,
  radiusMeters = 1200
): Promise<NearbyExhibitionCard[]> {
  const today = getTodayKST();
  const exhibitions = await prisma.exhibition.findMany({
    where: {
      status: "PUBLISHED",
      endDate: { gte: today }
    },
    select: {
      id: true,
      title: true,
      artist: true,
      venue: true,
      region: true,
      district: true,
      startDate: true,
      endDate: true,
      heroTone: true,
      heroImageUrl: true,
      lat: true,
      lng: true
    },
    take: 400
  });

  return exhibitions
    .map((exhibition) => {
      const meters = distanceMeters(
        { lat, lng },
        { lat: exhibition.lat, lng: exhibition.lng }
      );
      return { ...exhibition, meters };
    })
    .filter((item) => item.meters <= radiusMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      venue: item.venue,
      region: item.region,
      district: item.district,
      startDate: item.startDate,
      endDate: item.endDate,
      heroTone: item.heroTone,
      heroImageUrl: resolveMediaUrl(item.heroImageUrl) ?? null,
      distanceText: formatWalkDistance(item.meters)
    }));
}

export async function getHomeFeaturedPlaces(limit = 5): Promise<PlaceCard[]> {
  const places = await prisma.place.findMany({
    where: { isActive: true, homeFeatured: true },
    orderBy: [{ homeSortOrder: "asc" }, { updatedAt: "desc" }],
    take: limit
  });

  const cards = await Promise.all(
    places.map(async (place) => {
      const nearby = await findNearbyExhibitions(place.lat, place.lng, 1);
      const first = nearby[0];
      return toPlaceCard(
        place,
        first
          ? {
              id: first.id,
              title: first.title,
              venue: first.venue,
              distanceText: first.distanceText
            }
          : null
      );
    })
  );

  return cards;
}

export async function getPlaceById(id: string) {
  const place = await prisma.place.findFirst({
    where: { id, isActive: true }
  });
  if (!place) return null;

  const [nearbyExhibitions, curations] = await Promise.all([
    findNearbyExhibitions(place.lat, place.lng, 3),
    prisma.curation.findMany({
      where: {
        published: true,
        OR: [
          { basePlaceId: place.id },
          { stops: { some: { placeId: place.id } } }
        ]
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        coverImageUrl: true,
        coverTone: true,
        neighborhood: true,
        durationText: true
      },
      orderBy: { updatedAt: "desc" },
      take: 6
    })
  ]);

  return {
    ...toPlaceCard(place),
    nearbyExhibitions,
    curations: curations.map(
      (curation): PlaceCurationCard => ({
        id: curation.id,
        title: curation.title,
        subtitle: curation.subtitle,
        coverImageUrl: resolveMediaUrl(curation.coverImageUrl) ?? null,
        coverTone: curation.coverTone,
        neighborhood: curation.neighborhood,
        durationText: curation.durationText
      })
    )
  };
}
