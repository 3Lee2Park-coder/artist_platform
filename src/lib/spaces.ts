import { getTodayKST } from "@/lib/date";
import { parseJsonStringArray, parseJsonStringRecord } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";

export type SpaceType = "STUDIO" | "SHOWROOM" | "RESIDENCY" | "SHARED_SPACE";
export type SpaceVisitPolicy =
  | "WALK_IN"
  | "HOURS"
  | "APPOINTMENT"
  | "PROGRAM_ONLY"
  | "CLOSED";

export const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  STUDIO: "작업실",
  SHOWROOM: "쇼룸",
  RESIDENCY: "레지던시 공방",
  SHARED_SPACE: "공유 공간"
};

export const VISIT_POLICY_LABEL: Record<SpaceVisitPolicy, string> = {
  WALK_IN: "자유 방문 가능",
  HOURS: "운영 시간 내 방문 권장",
  APPOINTMENT: "예약자 우선",
  PROGRAM_ONLY: "프로그램 시간에만 방문",
  CLOSED: "현재 미운영"
};

export type SpaceVisitStatus = {
  policy: SpaceVisitPolicy;
  label: string;
  // ok: 방문 가능 강조, caution: 조건부, closed: 방문 불가, unknown: 확인 필요
  tone: "ok" | "caution" | "closed" | "unknown";
  todayHours: string | null;
};

export type SpaceOwner = {
  id: string;
  name: string;
  discipline: string | null;
  bio: string | null;
  instagramUrl: string | null;
  portfolioUrl: string | null;
  profileImageUrl: string | null;
};

export type SpaceSummary = {
  id: string;
  slug: string;
  name: string;
  type: SpaceType;
  typeLabel: string;
  region: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  floorOrUnit: string | null;
  shortDescription: string | null;
  description: string | null;
  storyJson: string;
  heroTone: string;
  heroImageUrl?: string;
  imageUrls: string[];
  visitStatus: SpaceVisitStatus;
  visitNotice: string | null;
  openingHours: Record<string, string>;
  owner: SpaceOwner | null;
  /** 공개 중인 프로그램 수 — 카드 배지용 */
  activeProgramCount: number;
  // 로그인 사용자 상태
  visited?: boolean;
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function isSpaceType(value: string): value is SpaceType {
  return ["STUDIO", "SHOWROOM", "RESIDENCY", "SHARED_SPACE"].includes(value);
}

function isVisitPolicy(value: string): value is SpaceVisitPolicy {
  return ["WALK_IN", "HOURS", "APPOINTMENT", "PROGRAM_ONLY", "CLOSED"].includes(value);
}

export function computeVisitStatus(
  policyRaw: string,
  openingHours: Record<string, string>,
  today = getTodayKST()
): SpaceVisitStatus {
  const policy = isVisitPolicy(policyRaw) ? policyRaw : "HOURS";
  const weekday = WEEKDAY_KEYS[new Date(`${today}T12:00:00+09:00`).getDay()];
  const todayHours = openingHours[weekday] ?? null;

  if (policy === "CLOSED") {
    return { policy, label: VISIT_POLICY_LABEL.CLOSED, tone: "closed", todayHours };
  }
  if (policy === "PROGRAM_ONLY") {
    return {
      policy,
      label: VISIT_POLICY_LABEL.PROGRAM_ONLY,
      tone: "caution",
      todayHours
    };
  }
  if (policy === "APPOINTMENT") {
    return {
      policy,
      label: VISIT_POLICY_LABEL.APPOINTMENT,
      tone: "caution",
      todayHours
    };
  }
  if (policy === "WALK_IN") {
    return { policy, label: VISIT_POLICY_LABEL.WALK_IN, tone: "ok", todayHours };
  }

  // HOURS: 오늘 운영시간 정보가 없으면 과장하지 않고 확인 필요로 표시
  if (!todayHours) {
    return {
      policy,
      label: Object.keys(openingHours).length > 0 ? "오늘 휴무" : "방문 전 확인 필요",
      tone: Object.keys(openingHours).length > 0 ? "closed" : "unknown",
      todayHours
    };
  }

  return {
    policy,
    label: `오늘 ${todayHours} 방문 가능`,
    tone: "ok",
    todayHours
  };
}

type DbSpace = Awaited<ReturnType<typeof fetchSpacesFromDb>>[number];

async function fetchSpacesFromDb() {
  const today = getTodayKST();
  return prisma.space.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          artistStatus: true,
          artistApplication: {
            select: {
              bio: true,
              discipline: true,
              instagramUrl: true,
              portfolioUrl: true,
              profileImageUrl: true
            }
          }
        }
      },
      programs: {
        where: {
          status: "PUBLISHED",
          isPublic: true,
          endDate: { gte: today }
        },
        select: { id: true }
      }
    }
  });
}

function toSpaceOwner(owner: DbSpace["owner"]): SpaceOwner | null {
  if (!owner || owner.artistStatus !== "APPROVED") return null;

  return {
    id: owner.id,
    name: owner.name,
    discipline: owner.artistApplication?.discipline ?? null,
    bio: owner.artistApplication?.bio ?? null,
    instagramUrl: owner.artistApplication?.instagramUrl ?? null,
    portfolioUrl: owner.artistApplication?.portfolioUrl ?? null,
    profileImageUrl:
      resolveMediaUrl(owner.artistApplication?.profileImageUrl) ?? null
  };
}

export function toSpaceSummary(record: DbSpace, today = getTodayKST()): SpaceSummary {
  const type = isSpaceType(record.type) ? record.type : "SHOWROOM";
  const openingHours = parseJsonStringRecord(record.openingHours);
  const programs =
    "programs" in record && Array.isArray(record.programs) ? record.programs : [];

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    type,
    typeLabel: SPACE_TYPE_LABEL[type],
    region: record.region,
    district: record.district,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    floorOrUnit: record.floorOrUnit,
    shortDescription: record.shortDescription,
    description: record.description,
    storyJson: "storyJson" in record ? String(record.storyJson ?? "[]") : "[]",
    heroTone: record.heroTone,
    heroImageUrl: resolveMediaUrl(record.heroImageUrl),
    imageUrls: parseJsonStringArray(record.imageUrls)
      .map((url) => resolveMediaUrl(url))
      .filter((url): url is string => Boolean(url)),
    visitStatus: computeVisitStatus(record.visitPolicy, openingHours, today),
    visitNotice: record.visitNotice,
    openingHours,
    owner: toSpaceOwner(record.owner),
    activeProgramCount: programs.length
  };
}

export async function getPublicSpaces(): Promise<SpaceSummary[]> {
  const records = await fetchSpacesFromDb();
  return records.map((record) => toSpaceSummary(record));
}

export async function getSpaceBySlug(slug: string): Promise<SpaceSummary | null> {
  const today = getTodayKST();
  const record = await prisma.space.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          artistStatus: true,
          artistApplication: {
            select: {
              bio: true,
              discipline: true,
              instagramUrl: true,
              portfolioUrl: true,
              profileImageUrl: true
            }
          }
        }
      },
      programs: {
        where: {
          status: "PUBLISHED",
          isPublic: true,
          endDate: { gte: today }
        },
        select: { id: true }
      }
    }
  });

  if (!record || record.status !== "PUBLISHED" || !record.isPublic) return null;
  return toSpaceSummary(record);
}

// 로그인 사용자의 방문 기록 상태 주입
export async function annotateSpaceViewerState<T extends SpaceSummary>(
  spaces: T[],
  userId?: string | null
): Promise<T[]> {
  if (!userId || spaces.length === 0) return spaces;

  const visits = await prisma.visit.findMany({
    where: { userId, spaceId: { in: spaces.map((space) => space.id) } },
    select: { spaceId: true }
  });
  const visitedSet = new Set(visits.map((visit) => visit.spaceId));

  return spaces.map((space) => ({ ...space, visited: visitedSet.has(space.id) }));
}
