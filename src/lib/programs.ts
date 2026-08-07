import { getTodayKST } from "@/lib/date";
import { parseJsonStringArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import {
  parseReservationSchedule,
  type ReservationDay
} from "@/lib/reservation-slots";
import { resolveMediaUrl } from "@/lib/storage-url";

export type ProgramType = "OPEN_STUDIO" | "ARTIST_TALK" | "WORKSHOP" | "TOUR";

export const PROGRAM_TYPE_LABEL: Record<ProgramType, string> = {
  OPEN_STUDIO: "오픈 스튜디오",
  ARTIST_TALK: "작가와의 대화",
  WORKSHOP: "워크숍",
  TOUR: "투어"
};

export type ProgramLifecycle = "upcoming" | "ongoing" | "ended";

export type ProgramVenue = {
  kind: "space" | "exhibition";
  name: string;
  address: string;
  district: string;
  href: string | null;
  lat: number | null;
  lng: number | null;
  floorOrUnit: string | null;
};

export type ProgramSummary = {
  id: string;
  slug: string;
  title: string;
  type: ProgramType;
  typeLabel: string;
  summary: string | null;
  description: string | null;
  storyJson: string;
  imageUrls: string[];
  heroTone: string;
  heroImageUrl?: string;
  startDate: string;
  endDate: string;
  lifecycle: ProgramLifecycle;
  reservationRequired: boolean;
  reservationSchedule: ReservationDay[];
  policyNote: string | null;
  hostName: string | null;
  hostUserId: string | null;
  exhibitionId: string | null;
  exhibitionTitle: string | null;
  /** @deprecated Prefer `venue` — kept for existing call sites */
  space: {
    id: string;
    slug: string;
    name: string;
    district: string;
    address: string;
    floorOrUnit: string | null;
    lat: number;
    lng: number;
  } | null;
  venue: ProgramVenue;
  // 가장 가까운 예약 가능 슬롯 (예: "8/9 14:00")
  nextSlotLabel: string | null;
  // 로그인 사용자 상태
  visited?: boolean;
};

function isProgramType(value: string): value is ProgramType {
  return ["OPEN_STUDIO", "ARTIST_TALK", "WORKSHOP", "TOUR"].includes(value);
}

function computeProgramLifecycle(
  startDate: string,
  endDate: string,
  today: string
): ProgramLifecycle {
  if (today < startDate) return "upcoming";
  if (today > endDate) return "ended";
  return "ongoing";
}

function findNextSlotLabel(
  schedule: ReservationDay[],
  today: string
): string | null {
  const upcoming = schedule
    .filter((day): day is ReservationDay & { date: string } =>
      Boolean(day.date && day.date >= today && day.slots.length > 0)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const first = upcoming[0];
  if (!first) return null;

  const [, month, dayOfMonth] = first.date.split("-");
  const time = [...first.slots].sort((a, b) => a.time.localeCompare(b.time))[0]?.time;
  return time ? `${Number(month)}/${Number(dayOfMonth)} ${time}` : null;
}

const programInclude = {
  space: {
    select: {
      id: true,
      slug: true,
      name: true,
      district: true,
      address: true,
      floorOrUnit: true,
      lat: true,
      lng: true,
      status: true,
      isPublic: true
    }
  },
  host: { select: { id: true, name: true } },
  exhibition: {
    select: {
      id: true,
      title: true,
      status: true,
      venue: true,
      address: true,
      district: true,
      lat: true,
      lng: true,
      startDate: true,
      endDate: true
    }
  }
} as const;

type DbProgram = Awaited<ReturnType<typeof fetchProgramsFromDb>>[number];

async function fetchProgramsFromDb() {
  return prisma.program.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    include: programInclude
  });
}

function buildVenue(record: DbProgram): ProgramVenue {
  // 전시 연계 프로그램은 전시 장소를 우선 표시 (타인 소유 갤러리 공간 포함)
  if (record.exhibition) {
    return {
      kind: "exhibition",
      name: record.exhibition.venue || record.exhibition.title,
      address: record.exhibition.address,
      district: record.exhibition.district,
      href: `/exhibitions/${record.exhibition.id}`,
      lat: record.exhibition.lat,
      lng: record.exhibition.lng,
      floorOrUnit: null
    };
  }

  if (record.space) {
    return {
      kind: "space",
      name: record.space.name,
      address: record.space.address,
      district: record.space.district,
      href: `/spaces/${record.space.slug}`,
      lat: record.space.lat,
      lng: record.space.lng,
      floorOrUnit: record.space.floorOrUnit
    };
  }

  return {
    kind: "space",
    name: "장소 미정",
    address: "",
    district: "",
    href: null,
    lat: null,
    lng: null,
    floorOrUnit: null
  };
}

export function programDatesWithinExhibition(
  startDate: string,
  endDate: string,
  exhibition: { startDate: string; endDate: string; title: string }
): string | null {
  if (startDate < exhibition.startDate || endDate > exhibition.endDate) {
    return `프로그램 기간은 전시 «${exhibition.title}» 기간(${exhibition.startDate} ~ ${exhibition.endDate}) 안에 있어야 합니다.`;
  }
  return null;
}

export function toProgramSummary(
  record: DbProgram,
  today = getTodayKST()
): ProgramSummary {
  const type = isProgramType(record.type) ? record.type : "OPEN_STUDIO";
  const reservationSchedule = parseReservationSchedule(record.reservationSlots);
  const venue = buildVenue(record);

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    type,
    typeLabel: PROGRAM_TYPE_LABEL[type],
    summary: record.summary,
    description: record.description,
    storyJson: "storyJson" in record ? String(record.storyJson ?? "[]") : "[]",
    imageUrls: parseJsonStringArray(
      "imageUrls" in record ? String(record.imageUrls ?? "[]") : "[]"
    )
      .map((url) => resolveMediaUrl(url))
      .filter((url): url is string => Boolean(url)),
    heroTone: record.heroTone,
    heroImageUrl: resolveMediaUrl(record.heroImageUrl),
    startDate: record.startDate,
    endDate: record.endDate,
    lifecycle: computeProgramLifecycle(record.startDate, record.endDate, today),
    reservationRequired: record.reservationRequired,
    reservationSchedule,
    policyNote: record.policyNote,
    hostName: record.host?.name ?? null,
    hostUserId: record.host?.id ?? null,
    exhibitionId: record.exhibition?.id ?? null,
    exhibitionTitle: record.exhibition?.title ?? null,
    space: record.space
      ? {
          id: record.space.id,
          slug: record.space.slug,
          name: record.space.name,
          district: record.space.district,
          address: record.space.address,
          floorOrUnit: record.space.floorOrUnit,
          lat: record.space.lat,
          lng: record.space.lng
        }
      : null,
    venue,
    nextSlotLabel: findNextSlotLabel(reservationSchedule, today)
  };
}

function isPubliclyListed(record: DbProgram) {
  if (record.exhibition) {
    return record.exhibition.status === "PUBLISHED";
  }
  if (record.space) {
    return record.space.status === "PUBLISHED" && record.space.isPublic;
  }
  return false;
}

export async function getPublicPrograms(): Promise<ProgramSummary[]> {
  const records = await fetchProgramsFromDb();
  return records.filter(isPubliclyListed).map((record) => toProgramSummary(record));
}

// 진행 중이거나 예정인 프로그램만
export async function getActivePrograms(
  today = getTodayKST()
): Promise<ProgramSummary[]> {
  const programs = await getPublicPrograms();
  return programs.filter((program) => program.endDate >= today);
}

export async function getProgramBySlug(
  slug: string
): Promise<ProgramSummary | null> {
  const record = await prisma.program.findUnique({
    where: { slug },
    include: programInclude
  });

  if (!record || record.status !== "PUBLISHED" || !record.isPublic) return null;
  if (!isPubliclyListed(record)) return null;
  return toProgramSummary(record);
}

export async function getProgramsBySpaceId(
  spaceId: string,
  today = getTodayKST()
): Promise<ProgramSummary[]> {
  const programs = await getPublicPrograms();
  return programs.filter(
    (program) => program.space?.id === spaceId && program.endDate >= today
  );
}

// 프로그램별 잔여석 (미래 슬롯 기준)
export async function getProgramRemainingSeats(
  programIds: string[],
  today = getTodayKST()
): Promise<Record<string, number>> {
  if (programIds.length === 0) return {};

  const [records, bookings] = await Promise.all([
    prisma.program.findMany({
      where: { id: { in: programIds } },
      select: { id: true, reservationSlots: true }
    }),
    prisma.reservation.groupBy({
      by: ["programId", "visitDate", "slot"],
      where: { programId: { in: programIds }, status: "CONFIRMED" },
      _count: { _all: true }
    })
  ]);

  const bookedMap = new Map<string, number>();
  for (const row of bookings) {
    if (!row.programId) continue;
    bookedMap.set(
      `${row.programId}|${row.visitDate}|${row.slot}`,
      row._count._all
    );
  }

  const result: Record<string, number> = {};
  for (const record of records) {
    const schedule = parseReservationSchedule(record.reservationSlots);
    let remaining = 0;
    for (const day of schedule) {
      if (!day.date || day.date < today) continue;
      for (const slot of day.slots) {
        const booked =
          bookedMap.get(`${record.id}|${day.date}|${slot.time}`) ?? 0;
        remaining += Math.max(0, slot.capacity - booked);
      }
    }
    result[record.id] = remaining;
  }

  return result;
}
