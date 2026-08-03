import type { Exhibition } from "@/types/exhibition";
import { getTodayKST } from "@/lib/date";

export type CourseBasePlace = {
  name: string;
  address: string | null;
  reason: string | null;
  placeUrl: string | null;
  lat: number | null;
  lng: number | null;
};

export type CourseSections = {
  intro: string | null;
  basePlace: CourseBasePlace | null;
  flow: string[];
  tip: string | null;
  rawWithoutMeta: string | null;
};

const SECTION_KEYS = ["거점", "추천 흐름", "팁", "이 반경 안 전시"] as const;

function isSectionHeader(line: string) {
  const trimmed = line.trim();
  return SECTION_KEYS.some(
    (key) => trimmed === key || trimmed.startsWith(`${key} `) || trimmed.startsWith(`${key}(`)
  );
}

function sectionKey(line: string): (typeof SECTION_KEYS)[number] | null {
  const trimmed = line.trim();
  for (const key of SECTION_KEYS) {
    if (trimmed === key || trimmed.startsWith(`${key} `) || trimmed.startsWith(`${key}(`)) {
      return key;
    }
  }
  return null;
}

function parseCoordLine(line: string): { lat: number; lng: number } | null {
  const match = line.match(/좌표\s*[:：]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

function parseBasePlace(lines: string[]): CourseBasePlace | null {
  if (lines.length === 0) return null;

  let name: string | null = null;
  let address: string | null = null;
  let reason: string | null = null;
  let placeUrl: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const coords = parseCoordLine(line);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      continue;
    }

    if (/^https?:\/\//.test(line)) {
      placeUrl = line;
      continue;
    }

    if (line.startsWith("—") || line.startsWith("-")) {
      reason = line.replace(/^[—\-]\s*/, "");
      continue;
    }

    if (!name) {
      // "로우키 성수점 (연무장3길 6)" 형태 지원
      const withParen = line.match(/^(.+?)\s*\((.+)\)$/);
      if (withParen) {
        name = withParen[1].trim();
        address = withParen[2].trim();
      } else {
        name = line;
      }
      continue;
    }

    if (!address && (line.includes("구") || line.includes("로") || line.includes("길"))) {
      address = line;
      continue;
    }

    if (!reason) {
      reason = line;
    }
  }

  if (!name) return null;

  return { name, address, reason, placeUrl, lat, lng };
}

/** description을 거점 / 추천 흐름 / 팁 섹션으로 파싱 */
export function parseCourseDescription(description: string | null | undefined): CourseSections {
  if (!description?.trim()) {
    return { intro: null, basePlace: null, flow: [], tip: null, rawWithoutMeta: null };
  }

  const lines = description.split("\n");
  const buckets: Record<string, string[]> = {
    intro: [],
    거점: [],
    "추천 흐름": [],
    팁: [],
    "이 반경 안 전시": []
  };

  let current: keyof typeof buckets = "intro";

  for (const line of lines) {
    const key = sectionKey(line);
    if (key) {
      current = key;
      continue;
    }
    buckets[current].push(line);
  }

  const intro = buckets.intro.join("\n").trim() || null;
  const tip = buckets["팁"].join("\n").trim() || null;
  const flow = buckets["추천 흐름"]
    .map((line) => line.trim().replace(/^[-•·]\s*/, ""))
    .filter(Boolean);
  const basePlace = parseBasePlace(buckets["거점"]);

  return {
    intro,
    basePlace,
    flow,
    tip,
    rawWithoutMeta: description
  };
}

export type EditorialBadge = {
  label: string;
  tone?: "near" | "ending" | "quiet" | "photo" | "reservable" | "immersive";
};

/** sortOrder·종료일·예약 가능 여부로 편집 배지 생성 (스키마 변경 없이 Phase A) */
export function getEditorialBadges(
  exhibition: Exhibition,
  index: number,
  today = getTodayKST()
): EditorialBadge[] {
  const badges: EditorialBadge[] = [];

  if (index === 0) {
    badges.push({ label: "가장 가까움", tone: "near" });
  }

  const end = new Date(`${exhibition.endDate}T00:00:00+09:00`);
  const now = new Date(`${today}T00:00:00+09:00`);
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft >= 0 && daysLeft <= 14) {
    badges.push({ label: "마감 임박", tone: "ending" });
  }

  if (exhibition.reservable) {
    badges.push({ label: "예약 가능", tone: "reservable" });
  }

  if (exhibition.categories.includes("사진")) {
    badges.push({ label: "사진", tone: "photo" });
  }

  // 대형 몰입형 휴리스틱
  if (
    exhibition.title.includes("전집중") ||
    exhibition.summary.includes("몰입") ||
    exhibition.venue.includes("에스팩토리")
  ) {
    badges.push({ label: "몰입형", tone: "immersive" });
  }

  if (
    exhibition.summary.includes("조용") ||
    exhibition.description.includes("조용")
  ) {
    badges.push({ label: "조용함", tone: "quiet" });
  }

  // 배지 과다 방지
  return badges.slice(0, 3);
}

export function getDistanceHint(index: number): string | null {
  const hints = ["도보 2분", "도보 4분", "도보 8~10분", "도보 10분 내", "도보 10분 내"];
  return hints[index] ?? null;
}
