import { getTodayKST } from "@/lib/date";
import { PLACE_TYPE_LABEL } from "@/lib/places";
import {
  CURATION_STOP_TYPE_LABEL,
  type CurationStopItem,
  type CurationSummary
} from "@/lib/exhibitions";

/**
 * 도시락 — 큐레이션을 손님에게 건네는 상품 포장.
 *
 * DB/어드민은 계속 Curation이고, 손님 화면에서만 도시락으로 부른다.
 * 밥(전시) 한 칸 + 반찬(장소·공간) 여러 칸이며, 칸 수는 실제 정차 수를 따른다.
 * 전시는 기간이 있으므로, 기간이 끝난 칸은 «마감»으로 표시하고
 * 밥이 모두 끝난 도시락은 홈 노출에서 빠진다(servable=false).
 */

export const DOSIRAK_BRAND = {
  /** 홈 섹션 간판 */
  boardLabel: "오늘의 도시락",
  /** 상품 단위 */
  unit: "도시락",
  tagline: "도시 곳곳에 숨어 있는 작가와 장소를 도시락처럼 담아 건넵니다."
} as const;

/** 한 도시락(1코스)에 담는 최대 칸 수 — 프로토타입 4~7 picks 레이아웃 */
export const DOSIRAK_MAX_PICKS = 7;

export function dosirakPicks(dosirak: Dosirak) {
  return dosirak.compartments.slice(0, DOSIRAK_MAX_PICKS);
}

export function dosirakSlotLabel(index: number) {
  if (index === 0) return "MAIN";
  return String(index).padStart(2, "0");
}

/**
 * 뚜껑을 열었을 때 식판 아래 한 줄.
 * 부제만 쓰고, 길거나 지저분하면 숨긴다. 본문 description은 넣지 않는다.
 */
export function dosirakEditorialLine(dosirak: Dosirak) {
  const text = (dosirak.subtitle ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 16 || text.length > 88) return null;
  if (text === dosirak.title.trim()) return null;
  if (/https?:\/\/|www\.|[{}\[\]<>]/.test(text)) return null;
  return text;
}

/** 이 일수 안에 갱신되면 «새로 담았어요» — 운영이 3~4일 간격으로 올린다 */
const FRESH_WITHIN_DAYS = 4;
/** 이 일수 안에 끝나는 전시는 손님에게 서두르라고 알린다 */
const ENDING_SOON_DAYS = 7;

export type DosirakCompartmentRole = "rice" | "side";

export type DosirakCompartment = {
  key: string;
  role: DosirakCompartmentRole;
  /** 전시 · 작가 공간 · 카페 등 — 손님·작가에게 보이는 칸 이름 */
  typeLabel: string;
  title: string;
  subtitle: string | null;
  note: string | null;
  href: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
  tone: string | null;
  distanceText: string | null;
  badge: string | null;
  artist: string | null;
  /** 전시 기간이 지난 칸 */
  ended: boolean;
  /** 전시 종료까지 남은 일수 (전시 칸만) */
  daysLeft: number | null;
};

export type Dosirak = {
  id: string;
  /** 시리즈 번호 «07» */
  number: string;
  href: string;
  title: string;
  subtitle: string | null;
  intro: string | null;
  neighborhood: string | null;
  durationText: string | null;
  coverImageUrl: string | null;
  coverTone: string;
  rice: DosirakCompartment | null;
  sides: DosirakCompartment[];
  /** 밥 + 반찬 (마감 칸 포함) */
  compartments: DosirakCompartment[];
  compartmentCount: number;
  /** 갱신 후 지난 일수 */
  updatedDaysAgo: number;
  freshLabel: string;
  isFresh: boolean;
  /** 진행 중 전시 칸 수 */
  activeExhibitionCount: number;
  endedCount: number;
  /** 가장 먼저 끝나는 전시의 남은 일수 */
  soonestDaysLeft: number | null;
  endingSoon: boolean;
  /** 홈에 내놓을 수 있는 상태인지 */
  servable: boolean;
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

/** from → to 사이 일수. 날짜 문자열이 깨져 있으면 null */
export function daysBetweenDates(from: string, to: string) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (start === null || end === null) return null;
  return Math.round((end - start) / 86_400_000);
}

function typeLabelOf(stop: CurationStopItem) {
  if (stop.stopType === "PLACE") {
    // PLACE 정차의 subtitle에는 이미 «카페» 같은 유형 라벨이 들어온다
    const fromSubtitle = stop.subtitle?.split("·")[0]?.trim();
    if (fromSubtitle && Object.values(PLACE_TYPE_LABEL).includes(fromSubtitle)) {
      return fromSubtitle;
    }
    return PLACE_TYPE_LABEL.ETC;
  }
  return CURATION_STOP_TYPE_LABEL[stop.stopType];
}

function toCompartment(
  stop: CurationStopItem,
  role: DosirakCompartmentRole,
  today: string
): DosirakCompartment {
  const daysLeft =
    stop.stopType === "EXHIBITION" && stop.endDate
      ? daysBetweenDates(today, stop.endDate)
      : null;

  return {
    key: stop.id,
    role,
    typeLabel: typeLabelOf(stop),
    title: stop.title,
    subtitle: stop.subtitle,
    note: stop.note,
    href: stop.href,
    externalUrl: stop.externalUrl,
    imageUrl: stop.heroImageUrl,
    tone: stop.heroTone,
    distanceText: stop.distanceText,
    badge: stop.editorialBadge,
    artist: stop.artist ?? null,
    ended: daysLeft !== null && daysLeft < 0,
    daysLeft
  };
}

function freshLabelOf(daysAgo: number) {
  if (daysAgo <= 0) return "오늘 담았어요";
  if (daysAgo === 1) return "어제 담았어요";
  return `${daysAgo}일 전에 담았어요`;
}

function seriesNumber(order: number) {
  return String(order + 1).padStart(2, "0");
}

/**
 * 큐레이션 하나를 도시락으로 포장한다.
 * `order`는 시리즈 번호용(0-based)이며, 목록 전체를 알아야 안정적으로 매겨진다.
 */
export function toDosirak(
  curation: CurationSummary,
  order: number,
  today = getTodayKST()
): Dosirak {
  const stops = [...curation.stops].sort((a, b) => a.sortOrder - b.sortOrder);

  const exhibitionStops = stops.filter((stop) => stop.stopType === "EXHIBITION");
  const activeExhibitionStops = exhibitionStops.filter((stop) => {
    if (!stop.endDate) return true;
    const left = daysBetweenDates(today, stop.endDate);
    return left === null || left >= 0;
  });

  // 밥은 진행 중 전시 우선 → 없으면 첫 전시 → 전시가 없으면 작가 공간
  const riceStop =
    activeExhibitionStops[0] ??
    exhibitionStops[0] ??
    stops.find((stop) => stop.stopType === "SPACE") ??
    null;

  const rice = riceStop ? toCompartment(riceStop, "rice", today) : null;

  const sides = stops
    .filter((stop) => stop.id !== riceStop?.id)
    .map((stop) => toCompartment(stop, "side", today));

  const compartments = rice ? [rice, ...sides] : sides;

  const daysLeftValues = compartments
    .map((item) => item.daysLeft)
    .filter((value): value is number => value !== null && value >= 0);

  const soonestDaysLeft =
    daysLeftValues.length > 0 ? Math.min(...daysLeftValues) : null;

  const updatedDaysAgo = Math.max(
    0,
    daysBetweenDates(curation.updatedAt.slice(0, 10), today) ?? 0
  );

  const endedCount = compartments.filter((item) => item.ended).length;

  // 전시를 담았는데 전부 끝났으면 홈에 내놓지 않는다.
  // 전시가 애초에 없는 장소 코스는 기간 개념이 없으므로 계속 내놓는다.
  const hasExhibition = exhibitionStops.length > 0;
  const servable =
    compartments.length > 0 &&
    (!hasExhibition || activeExhibitionStops.length > 0);

  return {
    id: curation.id,
    number: seriesNumber(order),
    href: `/decks/${curation.id}`,
    title: curation.title,
    subtitle: curation.subtitle,
    intro: curation.subtitle,
    neighborhood: curation.neighborhood,
    durationText: curation.durationText,
    coverImageUrl: curation.coverImageUrl,
    coverTone: curation.coverTone,
    rice,
    sides,
    compartments,
    compartmentCount: compartments.length,
    updatedDaysAgo,
    freshLabel: freshLabelOf(updatedDaysAgo),
    isFresh: updatedDaysAgo <= FRESH_WITHIN_DAYS,
    activeExhibitionCount: activeExhibitionStops.length,
    endedCount,
    soonestDaysLeft,
    endingSoon:
      soonestDaysLeft !== null && soonestDaysLeft <= ENDING_SOON_DAYS,
    servable
  };
}

/**
 * 도시락 목록. 시리즈 번호는 만든 순서(오래된 것부터 01)로 고정해서
 * 정렬이 바뀌어도 같은 도시락이 같은 번호를 유지한다.
 */
export function buildDosiraks(
  curations: CurationSummary[],
  today = getTodayKST()
): Dosirak[] {
  const numberById = new Map<string, number>();
  [...curations]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((curation, index) => numberById.set(curation.id, index));

  return curations.map((curation) =>
    toDosirak(curation, numberById.get(curation.id) ?? 0, today)
  );
}

/**
 * 홈 «오늘의 도시락»에 올릴 것 고르기.
 * featured → 갱신이 최근인 순. 기간이 끝난 도시락은 빠진다.
 */
export function pickTodayDosiraks(
  curations: CurationSummary[],
  limit = 2,
  today = getTodayKST()
): Dosirak[] {
  const featuredIds = new Set(
    curations.filter((curation) => curation.featured).map((curation) => curation.id)
  );

  const servable = buildDosiraks(curations, today).filter(
    (dosirak) => dosirak.servable
  );

  return servable
    .sort((a, b) => {
      const featuredDiff =
        Number(featuredIds.has(b.id)) - Number(featuredIds.has(a.id));
      if (featuredDiff !== 0) return featuredDiff;
      if (a.updatedDaysAgo !== b.updatedDaysAgo) {
        return a.updatedDaysAgo - b.updatedDaysAgo;
      }
      return b.compartmentCount - a.compartmentCount;
    })
    .slice(0, Math.max(0, limit));
}

/** 식판 아래에 붙는 한 줄 — 동네 · 칸 수 · 소요 시간 */
export function dosirakMetaLine(dosirak: Dosirak) {
  return [
    dosirak.neighborhood,
    `${dosirak.compartmentCount}곳`,
    dosirak.durationText
  ]
    .filter(Boolean)
    .join(" · ");
}

export type DosirakAisle = {
  id: string;
  title: string;
  note?: string;
  items: Dosirak[];
};

/** 진열대 상단 탭 — 기분 태그가 없어서, 실제 필드(갱신·동네·전시 기간)로 나눈다. */
export type DosirakShelfTabId = "recent" | "hood" | "now";

export const DOSIRAK_SHELF_TABS: {
  id: DosirakShelfTabId;
  label: string;
}[] = [
  { id: "recent", label: "최근" },
  { id: "hood", label: "동네" },
  { id: "now", label: "지금" }
];

function sortNewest(items: Dosirak[]) {
  return [...items].sort((a, b) => {
    if (a.updatedDaysAgo !== b.updatedDaysAgo) {
      return a.updatedDaysAgo - b.updatedDaysAgo;
    }
    return b.number.localeCompare(a.number);
  });
}

function closedAisle(closed: Dosirak[]): DosirakAisle[] {
  if (closed.length === 0) return [];
  return [
    {
      id: "closed",
      title: "기간이 지난 도시락",
      note: "담긴 전시가 끝난 코스입니다. 동네 장소는 그대로 남아 있습니다.",
      items: sortNewest(closed)
    }
  ];
}

/** 술래가 담은 순서. 새로 올린 것과 먼저 남겨 둔 것을 나눈다. */
export function groupDosiraksByRecency(dosiraks: Dosirak[]): DosirakAisle[] {
  const fresh = sortNewest(dosiraks.filter((item) => item.isFresh));
  const earlier = sortNewest(dosiraks.filter((item) => !item.isFresh));
  const aisles: DosirakAisle[] = [];

  if (fresh.length > 0) {
    aisles.push({
      id: "fresh",
      title: "새로 담았어요",
      note: "이번 주 술래가 담아 온 것들.",
      items: fresh
    });
  }
  if (earlier.length > 0) {
    aisles.push({
      id: "earlier",
      title: "먼저 담아 둔 것",
      note: "동네에 남겨 둔 코스입니다.",
      items: earlier
    });
  }
  return aisles;
}

/** 걷고 싶은 동네로 고를 때. */
export function groupDosiraksByNeighborhood(dosiraks: Dosirak[]): DosirakAisle[] {
  const byHood = new Map<string, Dosirak[]>();
  for (const item of dosiraks) {
    const title = item.neighborhood?.trim() || "그 밖의 동네";
    const list = byHood.get(title) ?? [];
    list.push(item);
    byHood.set(title, list);
  }

  return [...byHood.entries()]
    .sort((left, right) => {
      const leftFresh = Math.min(...left[1].map((item) => item.updatedDaysAgo));
      const rightFresh = Math.min(...right[1].map((item) => item.updatedDaysAgo));
      if (leftFresh !== rightFresh) return leftFresh - rightFresh;
      return left[0].localeCompare(right[0], "ko");
    })
    .map(([title, items]) => ({
      id: `hood-${title}`,
      title,
      items: sortNewest(items)
    }));
}

/** 오늘 바로 갈 수 있는지. 곧 끝나는 전시는 따로 둔다. */
export function groupDosiraksByAvailability(dosiraks: Dosirak[]): DosirakAisle[] {
  const soon = sortNewest(dosiraks.filter((item) => item.endingSoon));
  const open = sortNewest(dosiraks.filter((item) => !item.endingSoon));
  const aisles: DosirakAisle[] = [];

  if (open.length > 0) {
    aisles.push({
      id: "open",
      title: "지금 갈 수 있어요",
      note: "담긴 전시가 아직 열려 있는 코스입니다.",
      items: open
    });
  }
  if (soon.length > 0) {
    aisles.push({
      id: "soon",
      title: "이번 주 안에 끝나요",
      note: "전시를 먼저 보고, 동네는 천천히 이어도 됩니다.",
      items: soon
    });
  }
  return aisles;
}

export function groupDosiraksForShelf(
  served: Dosirak[],
  closed: Dosirak[],
  tab: DosirakShelfTabId
): DosirakAisle[] {
  const main =
    tab === "hood"
      ? groupDosiraksByNeighborhood(served)
      : tab === "now"
        ? groupDosiraksByAvailability(served)
        : groupDosiraksByRecency(served);
  return [...main, ...closedAisle(closed)];
}
