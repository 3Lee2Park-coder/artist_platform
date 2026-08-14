import { prisma } from "@/lib/prisma";
import { getTodayKST } from "@/lib/date";
import {
  flatSlotTimes,
  parseReservationSchedule
} from "@/lib/reservation-slots";
import { resolveMediaUrl } from "@/lib/storage-url";
import type {
  Artwork,
  Exhibition,
  ExhibitionCategory,
  ExhibitionLifecycle,
  ExhibitionSource,
  HeroTabKey
} from "@/types/exhibition";
import { unstable_cache } from "next/cache";

type DbExhibition = Awaited<ReturnType<typeof fetchExhibitionsFromDb>>[number];

function parseJsonArray<T extends string>(value: string): T[] {
  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

const toDate = (date: string) => new Date(`${date}T00:00:00+09:00`);

export function computeLifecycle(
  record: { startDate: string; endDate: string; lifecycleOverride: string | null },
  today = getTodayKST()
): ExhibitionLifecycle {
  if (record.lifecycleOverride === "CANCELLED") return "cancelled";
  if (record.lifecycleOverride === "EXTENDED") return "extended";

  const current = toDate(today);
  const starts = toDate(record.startDate);
  const ends = toDate(record.endDate);

  if (current < starts) return "upcoming";
  if (current > ends) return "ended";
  if (record.endDate === today) return "ending_soon";
  return "ongoing";
}

function toExhibition(record: DbExhibition): Exhibition {
  const categories = parseJsonArray<ExhibitionCategory>(record.categories);
  const reservationSchedule = parseReservationSchedule(record.reservationSlots);
  const reservationSlots = flatSlotTimes(reservationSchedule);
  const descriptionImages = parseJsonArray<string>(record.descriptionImages)
    .map((url) => resolveMediaUrl(url))
    .filter((url): url is string => Boolean(url));

  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    region: record.region,
    district: record.district,
    venue: record.venue,
    address: record.address,
    mapPosition: { lat: record.lat, lng: record.lng },
    startDate: record.startDate,
    endDate: record.endDate,
    categories,
    exhibitionType: record.exhibitionType as Exhibition["exhibitionType"],
    source: record.source as ExhibitionSource,
    registeredById: record.registeredById,
    lifecycle: computeLifecycle(record),
    curationAvailable: record.curationAvailable,
    reservable: record.reservable,
    todayOpen: record.todayOpen || undefined,
    popular: record.popular || undefined,
    nearby: record.nearby || undefined,
    heroTone: record.heroTone,
    heroImageUrl: resolveMediaUrl(record.heroImageUrl),
    summary: record.summary,
    description: record.description,
    descriptionImages,
    reservationSlots,
    reservationSchedule,
    space:
      "space" in record && record.space
        ? {
            id: record.space.id,
            slug: record.space.slug,
            name: record.space.name
          }
        : null,
    artistVideo:
      record.artistVideoTitle && record.artistVideoStatus
        ? {
            id: `video-${record.id}`,
            title: record.artistVideoTitle,
            duration: record.artistVideoDuration ?? "00:00",
            posterTone:
              record.artistVideoPosterTone ??
              "linear-gradient(135deg, #ded6c9 0%, #6f7d7a 100%)",
            videoUrl: resolveMediaUrl(record.artistVideoUrl),
            status: record.artistVideoStatus as
              | "uploading"
              | "processing"
              | "ready"
              | "failed"
          }
        : undefined
  };
}

function toArtwork(record: {
  id: string;
  exhibitionId: string;
  title: string;
  artist: string;
  material: string;
  price: number | null;
  imageTone: string;
  imageUrl: string | null;
}): Artwork {
  return {
    id: record.id,
    exhibitionId: record.exhibitionId,
    title: record.title,
    artist: record.artist,
    material: record.material,
    price: record.price ?? undefined,
    imageTone: record.imageTone,
    imageUrl: resolveMediaUrl(record.imageUrl)
  };
}

async function fetchExhibitionsFromDb() {
  return prisma.exhibition.findMany({
    where: {
      status: "PUBLISHED",
      // 포스터 없는 전시는 카드 UI가 깨지므로 목록에서 제외
      // (작가 등록 전시는 등록 시 이미지 권장, 공공 API는 sync 단계에서 필터)
      OR: [
        { source: { not: "PUBLIC_API" } },
        { heroImageUrl: { not: null } }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      space: { select: { id: true, slug: true, name: true } }
    }
  });
}

/** Vercel/서버리스에서 매 요청 전체 테이블 스캔을 피하기 위한 짧은 TTL 캐시 */
const getCachedExhibitionRecords = unstable_cache(
  async () => fetchExhibitionsFromDb(),
  ["exhibitions-published-v1"],
  { revalidate: 60, tags: ["exhibitions"] }
);

function hasDisplayImage(exhibition: Exhibition): boolean {
  return Boolean(exhibition.heroImageUrl?.trim());
}

export async function getAllExhibitions(): Promise<Exhibition[]> {
  const records = await getCachedExhibitionRecords();
  return records.map(toExhibition);
}

export function filterActiveExhibitions(
  exhibitions: Exhibition[],
  today = getTodayKST()
) {
  const current = toDate(today);
  return exhibitions.filter((exhibition) => {
    const startsAt = toDate(exhibition.startDate);
    const endsAt = toDate(exhibition.endDate);
    return startsAt <= current && endsAt >= current;
  });
}

export async function getActiveExhibitions(today = getTodayKST()) {
  return filterActiveExhibitions(await getAllExhibitions(), today);
}

function isPlatformArtistSource(source: Exhibition["source"]) {
  // 작가·운영자가 직접 올린 전시를 공공 API보다 우선 노출
  return source === "ARTIST" || source === "ADMIN";
}

/** 작가 등록 전시를 홈/검색에서 묻히지 않도록 정렬 */
export function sortForDiscovery(exhibitions: Exhibition[]): Exhibition[] {
  return [...exhibitions].sort((a, b) => {
    const artistDiff =
      Number(isPlatformArtistSource(b.source)) -
      Number(isPlatformArtistSource(a.source));
    if (artistDiff !== 0) return artistDiff;

    const imageDiff =
      Number(hasDisplayImage(b)) - Number(hasDisplayImage(a));
    if (imageDiff !== 0) return imageDiff;

    return toDate(b.startDate).getTime() - toDate(a.startDate).getTime();
  });
}

/**
 * 홈·검색용 목록.
 * - 진행 중 전시
 * - 작가/플랫폼 전시는 시작 45일 전~종료 후 3일까지 함께 노출
 *   (큐레이션에만 넣고 목록에 안 뜨는 문제를 막기 위함)
 */
export async function getListedExhibitions(today = getTodayKST()) {
  const current = toDate(today);
  const upcomingHorizon = new Date(current);
  upcomingHorizon.setDate(upcomingHorizon.getDate() + 45);
  const graceEnd = new Date(current);
  graceEnd.setDate(graceEnd.getDate() - 3);

  const exhibitions = await getAllExhibitions();

  const listed = exhibitions.filter((exhibition) => {
    const startsAt = toDate(exhibition.startDate);
    const endsAt = toDate(exhibition.endDate);
    const isActive = startsAt <= current && endsAt >= current;

    if (isActive) return true;

    if (!isPlatformArtistSource(exhibition.source)) return false;

    // 곧 시작
    if (startsAt > current && startsAt <= upcomingHorizon) return true;
    // 방금 끝난 작가 전시 (공유·아카이브 여운)
    if (endsAt < current && endsAt >= graceEnd) return true;

    return false;
  });

  return sortForDiscovery(listed);
}

export async function getUpcomingExhibitions(today = getTodayKST()) {
  const current = toDate(today);
  const exhibitions = await getAllExhibitions();

  return exhibitions.filter((exhibition) => toDate(exhibition.startDate) > current);
}

export async function getActiveCategories(
  today = getTodayKST()
): Promise<ExhibitionCategory[]> {
  const categorySet = new Set<ExhibitionCategory>();

  (await getActiveExhibitions(today)).forEach((exhibition) => {
    exhibition.categories.forEach((category) => categorySet.add(category));
  });

  return Array.from(categorySet);
}

export async function getHeroTabs(today = getTodayKST()): Promise<HeroTabKey[]> {
  return [
    "today_open",
    "this_week",
    "upcoming",
    "nearby",
    ...(await getActiveCategories(today))
  ];
}

export async function getHeroExhibitionsByTab(
  tabKey: HeroTabKey,
  today = getTodayKST()
): Promise<Exhibition[]> {
  const activeExhibitions = await getActiveExhibitions(today);

  if (tabKey === "upcoming") {
    return getUpcomingExhibitions(today);
  }

  return activeExhibitions.filter((exhibition) => {
    if (tabKey === "today_open") {
      return exhibition.todayOpen;
    }

    if (tabKey === "this_week") {
      return exhibition.popular;
    }

    if (tabKey === "nearby") {
      return exhibition.nearby;
    }

    return exhibition.categories.includes(tabKey);
  });
}

export async function getRepresentativeExhibition(
  tabKey: HeroTabKey,
  today = getTodayKST()
): Promise<Exhibition | null> {
  const matched = await getHeroExhibitionsByTab(tabKey, today);
  const activeExhibitions = await getActiveExhibitions(today);

  return matched[0] ?? activeExhibitions[0] ?? null;
}

export async function getCategoryExhibitionGroups(today = getTodayKST()) {
  const categories = await getActiveCategories(today);
  const activeExhibitions = await getActiveExhibitions(today);

  return categories
    .map((category) => ({
      category,
      title: `${category} 전시`,
      exhibitions: activeExhibitions.filter((exhibition) =>
        exhibition.categories.includes(category)
      )
    }))
    .filter((group) => group.exhibitions.length > 0);
}

export async function getVideoExhibitions(today = getTodayKST()) {
  return (await getActiveExhibitions(today)).filter(
    (exhibition) =>
      exhibition.artistVideo?.status === "ready" && exhibition.artistVideo.videoUrl
  );
}

export async function getExhibitionsRegisteredByUserId(userId: string) {
  const records = await prisma.exhibition.findMany({
    where: {
      registeredById: userId,
      status: "PUBLISHED",
      source: { not: "PUBLIC_API" }
    },
    orderBy: { createdAt: "desc" },
    include: {
      space: { select: { id: true, slug: true, name: true } }
    }
  });

  return records.map(toExhibition);
}

export async function getExhibitionById(id: string) {
  const record = await prisma.exhibition.findUnique({
    where: { id },
    include: {
      space: { select: { id: true, slug: true, name: true } }
    }
  });

  return record ? toExhibition(record) : null;
}

export async function getArtworksByExhibitionId(exhibitionId: string) {
  const records = await prisma.artwork.findMany({
    where: { exhibitionId },
    orderBy: { title: "asc" }
  });

  return records.map(toArtwork);
}

export async function getAllArtworks() {
  const records = await prisma.artwork.findMany({
    orderBy: { title: "asc" }
  });

  return records.map(toArtwork);
}

/** 홈 등에서 쓰는 소량 작품 — 전체 artworks 테이블 로드를 피함 */
export async function getFeaturedArtworks(limit = 12) {
  const records = await prisma.artwork.findMany({
    where: { imageUrl: { not: null } },
    orderBy: { title: "asc" },
    take: limit
  });

  return records.map(toArtwork);
}

export type PeriodGroupKey =
  | "artist"
  | "this_week"
  | "today_open"
  | "ending_soon";

export type PeriodExhibitionGroup = {
  key: PeriodGroupKey;
  label: string;
  description: string;
  tag: "auto" | "manual";
  href: string;
  exhibitions: Exhibition[];
};

export async function getEndingSoonExhibitions(
  today = getTodayKST(),
  withinDays = 7
) {
  const current = toDate(today);
  const active = await getActiveExhibitions(today);

  return active
    .filter((exhibition) => {
      const ends = toDate(exhibition.endDate);
      const diffDays = Math.ceil(
        (ends.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays >= 0 && diffDays <= withinDays;
    })
    .sort((a, b) => toDate(a.endDate).getTime() - toDate(b.endDate).getTime());
}

export function daysUntilEnd(endDate: string, today = getTodayKST()) {
  const current = toDate(today);
  const ends = toDate(endDate);
  return Math.ceil((ends.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
}

const PERIOD_EXHIBITION_LIMIT = 3;

/** 개인화 전: 작가 전시 → 이미지 있는 전시 순으로 채움 */
function pickTimedExhibitions(
  pool: Exhibition[],
  predicate: (exhibition: Exhibition) => boolean,
  limit: number
): Exhibition[] {
  const matched = sortForDiscovery(pool.filter(predicate));
  return matched.slice(0, limit);
}

export async function getPeriodExhibitionGroups(
  today = getTodayKST(),
  listedInput?: Exhibition[]
): Promise<PeriodExhibitionGroup[]> {
  const listed = listedInput ?? (await getListedExhibitions(today));
  const active = listed.filter((exhibition) => {
    const startsAt = toDate(exhibition.startDate);
    const endsAt = toDate(exhibition.endDate);
    const current = toDate(today);
    return startsAt <= current && endsAt >= current;
  });
  const current = toDate(today);

  const weekAgo = new Date(current);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // 작가 등록 전시를 공공 API에 가리지 않도록 전용 슬롯
  const artistShows = pickTimedExhibitions(
    listed,
    (exhibition) => isPlatformArtistSource(exhibition.source),
    PERIOD_EXHIBITION_LIMIT
  );

  const thisWeekSeed = pickTimedExhibitions(
    active,
    (exhibition) => {
      const startedAt = toDate(exhibition.startDate);
      return exhibition.popular || startedAt >= weekAgo;
    },
    PERIOD_EXHIBITION_LIMIT
  );
  const thisWeek =
    thisWeekSeed.length >= PERIOD_EXHIBITION_LIMIT
      ? thisWeekSeed
      : [
          ...thisWeekSeed,
          ...pickTimedExhibitions(
            active.filter(
              (item) => !thisWeekSeed.some((picked) => picked.id === item.id)
            ),
            () => true,
            PERIOD_EXHIBITION_LIMIT - thisWeekSeed.length
          )
        ];

  const todayOpen = pickTimedExhibitions(
    listed,
    (exhibition) =>
      exhibition.todayOpen ||
      exhibition.startDate === today ||
      (isPlatformArtistSource(exhibition.source) &&
        exhibition.startDate > today &&
        toDate(exhibition.startDate).getTime() - current.getTime() <=
          7 * 24 * 60 * 60 * 1000),
    PERIOD_EXHIBITION_LIMIT
  );

  const endingSoon = pickTimedExhibitions(
    await getEndingSoonExhibitions(today),
    () => true,
    PERIOD_EXHIBITION_LIMIT
  );

  return [
    {
      key: "artist" as const,
      label: "작가 등록 전시",
      description: "개인 작가가 직접 올린 전시를 먼저 만나요.",
      tag: "manual" as const,
      href: "/exhibitions?source=artist",
      exhibitions: artistShows
    },
    {
      key: "this_week" as const,
      label: "이번주 주목",
      description: "지금 열려 있어 가보기 좋은 전시예요.",
      tag: "auto" as const,
      href: "/exhibitions?date=this_week",
      exhibitions: thisWeek
    },
    {
      key: "today_open" as const,
      label: "오늘·곧 오픈",
      description: "오늘 열리거나, 곧 시작하는 전시예요.",
      tag: "auto" as const,
      href: "/exhibitions?date=today",
      exhibitions: todayOpen
    },
    {
      key: "ending_soon" as const,
      label: "마감 임박",
      description: "이번 주 안에 끝나니, 지금이 타이밍이에요.",
      tag: "auto" as const,
      href: "/exhibitions?date=ending_soon",
      exhibitions: endingSoon
    }
  ].filter((group) => group.exhibitions.length > 0);
}

export type SearchFilters = {
  date?: "today" | "this_week" | "ending_soon" | "all";
  regions?: string[];
  districts?: string[];
  categories?: ExhibitionCategory[];
  curation?: "all" | "curation" | "reservable";
  source?: "all" | "artist" | "public";
  query?: string;
};

export async function searchExhibitions(filters: SearchFilters = {}) {
  let results = await getListedExhibitions();
  const today = getTodayKST();
  const current = toDate(today);
  const weekAgo = new Date(current);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (filters.source === "artist") {
    results = results.filter((exhibition) =>
      isPlatformArtistSource(exhibition.source)
    );
  }

  if (filters.source === "public") {
    results = results.filter((exhibition) => exhibition.source === "PUBLIC_API");
  }

  if (filters.date === "today") {
    results = results.filter(
      (exhibition) =>
        exhibition.todayOpen ||
        exhibition.startDate === today ||
        (isPlatformArtistSource(exhibition.source) &&
          exhibition.startDate > today &&
          toDate(exhibition.startDate).getTime() - current.getTime() <=
            7 * 24 * 60 * 60 * 1000)
    );
  }

  if (filters.date === "this_week") {
    results = results.filter((exhibition) => {
      const startedAt = toDate(exhibition.startDate);
      return exhibition.popular || startedAt >= weekAgo;
    });
  }

  if (filters.date === "ending_soon") {
    const endingSoonIds = new Set(
      (await getEndingSoonExhibitions()).map((exhibition) => exhibition.id)
    );
    results = results.filter((exhibition) => endingSoonIds.has(exhibition.id));
  }

  if (filters.districts && filters.districts.length > 0) {
    results = results.filter((exhibition) =>
      filters.districts!.some(
        (district) =>
          exhibition.district.includes(district) ||
          district.includes(exhibition.district) ||
          exhibition.venue.includes(district) ||
          exhibition.address.includes(district) ||
          exhibition.region.includes(district)
      )
    );
  }

  if (filters.regions && filters.regions.length > 0) {
    results = results.filter((exhibition) =>
      filters.regions!.some(
        (region) =>
          exhibition.region === region ||
          exhibition.address.includes(region) ||
          exhibition.district.includes(region)
      )
    );
  }

  if (filters.categories && filters.categories.length > 0) {
    results = results.filter((exhibition) =>
      exhibition.categories.some((category) =>
        filters.categories!.includes(category)
      )
    );
  }

  if (filters.curation === "curation") {
    results = results.filter((exhibition) => exhibition.curationAvailable);
  }

  if (filters.curation === "reservable") {
    results = results.filter((exhibition) => exhibition.reservable);
  }

  if (filters.query?.trim()) {
    const query = filters.query.trim().toLowerCase();

    results = results.filter(
      (exhibition) =>
        exhibition.title.toLowerCase().includes(query) ||
        exhibition.artist.toLowerCase().includes(query) ||
        exhibition.region.toLowerCase().includes(query) ||
        exhibition.district.toLowerCase().includes(query) ||
        exhibition.venue.toLowerCase().includes(query)
    );
  }

  return results;
}

export const CATEGORY_OPTIONS: ExhibitionCategory[] = [
  "회화",
  "사진",
  "조각",
  "복합"
];

export type CurationBasePlace = {
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
  imageUrl: string | null;
};

export type CurationExhibitionItem = Exhibition & {
  editorialBadge: string | null;
  distanceText: string | null;
  sortOrder: number;
};

export type CurationStopType = "SPACE" | "EXHIBITION" | "PLACE";

export const CURATION_STOP_TYPE_LABEL: Record<CurationStopType, string> = {
  SPACE: "작가 공간",
  EXHIBITION: "전시",
  PLACE: "동네 장소"
};

// 큐레이션 동선의 정차 지점 — 공간/전시/장소를 공통 표시 필드로 정규화
export type CurationStopItem = {
  id: string;
  sortOrder: number;
  stopType: CurationStopType;
  refId: string;
  title: string;
  subtitle: string | null;
  href: string | null;
  externalUrl: string | null;
  lat: number;
  lng: number;
  heroTone: string | null;
  heroImageUrl: string | null;
  editorialBadge: string | null;
  distanceText: string | null;
  note: string | null;
};

export type CurationSummary = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  storyJson: string;
  descriptionImages: string[];
  coverTone: string;
  coverImageUrl: string | null;
  featured: boolean;
  neighborhood: string | null;
  situationTags: string[];
  radiusMeters: number;
  durationText: string | null;
  basePlace: CurationBasePlace | null;
  createdAt: string;
  updatedAt: string;
  exhibitions: CurationExhibitionItem[];
  stops: CurationStopItem[];
};

const PLACE_TYPE_LABEL: Record<string, string> = {
  CAFE: "카페",
  RESTAURANT: "식당",
  WALK: "산책",
  ETC: "가볼 곳"
};

export async function getPublishedCurations(): Promise<CurationSummary[]> {
  const records = await prisma.curation.findMany({
    where: { published: true },
    // featured → sortOrder → 최신 수정순
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      basePlace: true,
      exhibitions: {
        orderBy: { sortOrder: "asc" },
        include: {
          exhibition: {
            include: { space: { select: { id: true, slug: true, name: true } } }
          }
        }
      },
      stops: {
        orderBy: { sortOrder: "asc" },
        include: {
          space: true,
          exhibition: {
            include: { space: { select: { id: true, slug: true, name: true } } }
          },
          place: true
        }
      }
    }
  });

  return records.map((curation) => {
    const exhibitions = curation.exhibitions
      .filter((item) => item.exhibition.status === "PUBLISHED")
      .map((item) => ({
        ...toExhibition(item.exhibition),
        editorialBadge: item.editorialBadge,
        distanceText: item.distanceText,
        sortOrder: item.sortOrder
      }));

    // CurationStop 우선, 없으면 레거시 CurationExhibition에서 합성
    const stops: CurationStopItem[] =
      curation.stops.length > 0
        ? curation.stops
            .map((stop): CurationStopItem | null => {
              if (stop.stopType === "SPACE" && stop.space) {
                if (stop.space.status !== "PUBLISHED" || !stop.space.isPublic) {
                  return null;
                }
                return {
                  id: stop.id,
                  sortOrder: stop.sortOrder,
                  stopType: "SPACE",
                  refId: stop.space.id,
                  title: stop.space.name,
                  subtitle: stop.space.shortDescription,
                  href: `/spaces/${stop.space.slug}`,
                  externalUrl: null,
                  lat: stop.space.lat,
                  lng: stop.space.lng,
                  heroTone: stop.space.heroTone,
                  heroImageUrl: resolveMediaUrl(stop.space.heroImageUrl) ?? null,
                  editorialBadge: stop.editorialBadge,
                  distanceText: stop.distanceText,
                  note: stop.note
                };
              }
              if (stop.stopType === "EXHIBITION" && stop.exhibition) {
                if (stop.exhibition.status !== "PUBLISHED") return null;
                return {
                  id: stop.id,
                  sortOrder: stop.sortOrder,
                  stopType: "EXHIBITION",
                  refId: stop.exhibition.id,
                  title: stop.exhibition.title,
                  subtitle: `${stop.exhibition.venue} · ${stop.exhibition.artist}`,
                  href: `/exhibitions/${stop.exhibition.id}`,
                  externalUrl: null,
                  lat: stop.exhibition.lat,
                  lng: stop.exhibition.lng,
                  heroTone: stop.exhibition.heroTone,
                  heroImageUrl:
                    resolveMediaUrl(stop.exhibition.heroImageUrl) ?? null,
                  editorialBadge: stop.editorialBadge,
                  distanceText: stop.distanceText,
                  note: stop.note
                };
              }
              if (stop.stopType === "PLACE" && stop.place) {
                return {
                  id: stop.id,
                  sortOrder: stop.sortOrder,
                  stopType: "PLACE",
                  refId: stop.place.id,
                  title: stop.place.name,
                  subtitle:
                    PLACE_TYPE_LABEL[stop.place.type] ?? stop.place.type,
                  href: `/places/${stop.place.id}`,
                  externalUrl:
                    stop.place.sourceUrl ||
                    `https://map.naver.com/p/search/${encodeURIComponent(stop.place.name)}`,
                  lat: stop.place.lat,
                  lng: stop.place.lng,
                  heroTone: null,
                  heroImageUrl: resolveMediaUrl(stop.place.imageUrl) ?? null,
                  editorialBadge: stop.editorialBadge,
                  distanceText: stop.distanceText,
                  note: stop.note ?? stop.place.notes ?? stop.place.editorialNote
                };
              }
              return null;
            })
            .filter((stop): stop is CurationStopItem => Boolean(stop))
        : exhibitions.map((exhibition, index) => ({
            id: `legacy-${curation.id}-${exhibition.id}`,
            sortOrder: index,
            stopType: "EXHIBITION" as const,
            refId: exhibition.id,
            title: exhibition.title,
            subtitle: `${exhibition.venue} · ${exhibition.artist}`,
            href: `/exhibitions/${exhibition.id}`,
            externalUrl: null,
            lat: exhibition.mapPosition.lat,
            lng: exhibition.mapPosition.lng,
            heroTone: exhibition.heroTone,
            heroImageUrl: exhibition.heroImageUrl ?? null,
            editorialBadge: exhibition.editorialBadge,
            distanceText: exhibition.distanceText,
            note: null
          }));

    return {
      id: curation.id,
      title: curation.title,
      subtitle: curation.subtitle,
      description: curation.description,
      storyJson:
        "storyJson" in curation ? String(curation.storyJson ?? "[]") : "[]",
      descriptionImages: parseJsonArray<string>(
        "descriptionImages" in curation
          ? String(curation.descriptionImages ?? "[]")
          : "[]"
      )
        .map((url) => resolveMediaUrl(url))
        .filter((url): url is string => Boolean(url)),
      coverTone: curation.coverTone,
      coverImageUrl: resolveMediaUrl(curation.coverImageUrl) ?? null,
      featured: Boolean(curation.featured),
      neighborhood: curation.neighborhood,
      situationTags: parseJsonArray(curation.situationTags),
      radiusMeters: curation.radiusMeters,
      durationText: curation.durationText,
      basePlace: curation.basePlace
        ? {
            id: curation.basePlace.id,
            name: curation.basePlace.name,
            type: curation.basePlace.type,
            region: curation.basePlace.region,
            district: curation.basePlace.district,
            address: curation.basePlace.address,
            lat: curation.basePlace.lat,
            lng: curation.basePlace.lng,
            sourceUrl: curation.basePlace.sourceUrl,
            notes: curation.basePlace.notes,
            imageUrl: resolveMediaUrl(curation.basePlace.imageUrl) ?? null
          }
        : null,
      createdAt: curation.createdAt.toISOString(),
      updatedAt: curation.updatedAt.toISOString(),
      exhibitions,
      stops
    };
  });
}

export async function getCurationById(id: string): Promise<CurationSummary | null> {
  const curations = await getPublishedCurations();
  return curations.find((curation) => curation.id === id) ?? null;
}

// 로그인 사용자의 저장/방문 상태를 전시 목록에 주입
export async function annotateViewerState<T extends Exhibition>(
  exhibitions: T[],
  userId?: string | null
): Promise<T[]> {
  if (!userId || exhibitions.length === 0) {
    return exhibitions;
  }

  const ids = exhibitions.map((exhibition) => exhibition.id);

  const [saves, visits] = await Promise.all([
    prisma.saveExhibition.findMany({
      where: { userId, exhibitionId: { in: ids } },
      select: { exhibitionId: true }
    }),
    prisma.visit.findMany({
      where: { userId, exhibitionId: { in: ids } },
      select: { exhibitionId: true }
    })
  ]);

  const savedSet = new Set(saves.map((item) => item.exhibitionId));
  const visitedSet = new Set(visits.map((item) => item.exhibitionId));

  return exhibitions.map((exhibition) => ({
    ...exhibition,
    saved: savedSet.has(exhibition.id),
    visited: visitedSet.has(exhibition.id)
  }));
}

export type ExhibitionReview = {
  id: string;
  userName: string;
  recommend: boolean;
  moodTags: string[];
  memo: string | null;
  createdAt: string;
  isMine: boolean;
};

export type RecommendStats = {
  total: number;
  recommendCount: number;
  rate: number; // 0-100
};

export async function getExhibitionReviews(
  exhibitionId: string,
  viewerId?: string | null
): Promise<{ reviews: ExhibitionReview[]; stats: RecommendStats; myReview: ExhibitionReview | null }> {
  const records = await prisma.review.findMany({
    where: { exhibitionId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } }
  });

  const reviews: ExhibitionReview[] = records.map((record) => ({
    id: record.id,
    userName: record.user.name,
    recommend: record.recommend,
    moodTags: parseJsonArray<string>(record.moodTags),
    memo: record.memo,
    createdAt: record.createdAt.toISOString(),
    isMine: viewerId ? record.user.id === viewerId : false
  }));

  const total = reviews.length;
  const recommendCount = reviews.filter((review) => review.recommend).length;
  const rate = total > 0 ? Math.round((recommendCount / total) * 100) : 0;

  return {
    reviews,
    stats: { total, recommendCount, rate },
    myReview: reviews.find((review) => review.isMine) ?? null
  };
}

export async function getViewerExhibitionState(
  exhibitionId: string,
  userId?: string | null
): Promise<{ saved: boolean; visited: boolean }> {
  if (!userId) {
    return { saved: false, visited: false };
  }

  const [save, visit] = await Promise.all([
    prisma.saveExhibition.findUnique({
      where: { userId_exhibitionId: { userId, exhibitionId } }
    }),
    prisma.visit.findUnique({
      where: { userId_exhibitionId: { userId, exhibitionId } }
    })
  ]);

  return { saved: Boolean(save), visited: Boolean(visit) };
}

export const SOURCE_BADGE: Record<
  ExhibitionSource,
  { label: string; tone: "official" | "public" }
> = {
  ADMIN: { label: "공식 큐레이션", tone: "official" },
  ARTIST: { label: "작가·갤러리 등록", tone: "official" },
  USER_REPORT: { label: "제보 전시", tone: "official" },
  PUBLIC_API: { label: "공공 정보", tone: "public" }
};
