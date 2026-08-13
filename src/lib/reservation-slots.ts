export type ReservationSlot = {
  time: string;
  capacity: number;
};

export type ReservationDay = {
  /** null이면 전시 기간 전체 날짜에 동일 슬롯 적용 (레거시) */
  date: string | null;
  slots: ReservationSlot[];
};

const DEFAULT_CAPACITY = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** DB JSON → 정규화된 스케줄 (레거시 string[] 호환) */
export function parseReservationSchedule(raw: string | null | undefined): ReservationDay[] {
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    // legacy: ["13:00", "15:00"]
    if (typeof parsed[0] === "string") {
      return [
        {
          date: null,
          slots: (parsed as string[])
            .map((time) => time.trim())
            .filter(Boolean)
            .map((time) => ({ time, capacity: DEFAULT_CAPACITY }))
        }
      ];
    }

    return parsed
      .map((item) => {
        if (!isRecord(item)) return null;
        const date =
          typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
            ? item.date
            : null;
        const slotsRaw = Array.isArray(item.slots) ? item.slots : [];
        const slots = slotsRaw
          .map((slot) => {
            if (typeof slot === "string") {
              return { time: slot.trim(), capacity: DEFAULT_CAPACITY };
            }
            if (!isRecord(slot) || typeof slot.time !== "string") return null;
            const capacity =
              typeof slot.capacity === "number" && slot.capacity > 0
                ? Math.floor(slot.capacity)
                : DEFAULT_CAPACITY;
            return { time: slot.time.trim(), capacity };
          })
          .filter((slot): slot is ReservationSlot => Boolean(slot?.time));

        if (slots.length === 0) return null;
        return { date, slots };
      })
      .filter((day): day is ReservationDay => Boolean(day));
  } catch {
    return [];
  }
}

export function serializeReservationSchedule(days: ReservationDay[]): string {
  const cleaned = days
    .map((day) => ({
      date: day.date,
      slots: day.slots
        .filter((slot) => slot.time)
        .map((slot) => ({
          time: slot.time,
          capacity: Math.max(1, Math.floor(slot.capacity || DEFAULT_CAPACITY))
        }))
    }))
    .filter((day) => day.slots.length > 0);

  return JSON.stringify(cleaned);
}

/** 작가 대화: 유효한 일정이 없으면 예약 불가(reservable=false)로 맞춘다. */
export function resolveTalkReservation(input: {
  reservable: boolean;
  schedule: ReservationDay[];
}) {
  if (!input.reservable) {
    return { reservable: false, schedule: [] as ReservationDay[] };
  }

  const schedule = input.schedule
    .filter((day) => Boolean(day.date) && day.slots.some((slot) => slot.time))
    .map((day) => ({
      date: day.date,
      slots: day.slots
        .filter((slot) => slot.time)
        .map((slot) => ({
          time: slot.time,
          capacity: Math.max(1, Math.floor(slot.capacity || DEFAULT_CAPACITY))
        }))
    }));

  if (schedule.length === 0) {
    return { reservable: false, schedule: [] as ReservationDay[] };
  }

  return { reservable: true, schedule };
}

export const TALK_SCHEDULE_REQUIRED_ERROR =
  "작가와 대화 날짜와 시간을 입력해 주세요.";

/**
 * 체크박스는 켜져 있는데 날짜가 비어 있으면 조용히 끄지 않고 오류로 돌린다.
 * (등록 Step 3에서는 일정 입력이 DOM에 없어 required가 먹지 않았음)
 */
export function requireTalkReservation(input: {
  reservable: boolean;
  schedule: ReservationDay[];
}) {
  const talk = resolveTalkReservation(input);
  if (input.reservable && !talk.reservable) {
    return { ok: false as const, error: TALK_SCHEDULE_REQUIRED_ERROR };
  }
  return { ok: true as const, reservable: talk.reservable, schedule: talk.schedule };
}

/** 대화 날짜가 비어 있으면 전시 시작일로 채운다. 이미 고른 날짜는 유지. */
export function fillEmptyTalkDates(
  schedule: ReservationDay[],
  startDate: string
): ReservationDay[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return schedule;
  return schedule.map((day) => (day.date ? day : { ...day, date: startDate }));
}

export function getSlotsForDate(
  schedule: ReservationDay[],
  visitDate: string
): ReservationSlot[] {
  const dated = schedule.find((day) => day.date === visitDate);
  if (dated) return dated.slots;

  const legacy = schedule.find((day) => day.date === null);
  return legacy?.slots ?? [];
}

export function getAvailableDates(
  schedule: ReservationDay[],
  startDate: string,
  endDate: string
): string[] {
  const dated = schedule
    .map((day) => day.date)
    .filter((date): date is string => Boolean(date))
    .filter((date) => date >= startDate && date <= endDate)
    .sort();

  if (dated.length > 0) {
    return Array.from(new Set(dated));
  }

  // 레거시: 기간 내 임의 날짜 선택 가능 — UI에서는 min/max date input 사용
  return [];
}

export function flatSlotTimes(schedule: ReservationDay[]): string[] {
  return Array.from(
    new Set(schedule.flatMap((day) => day.slots.map((slot) => slot.time)))
  );
}

export function findSlotCapacity(
  schedule: ReservationDay[],
  visitDate: string,
  time: string
): number | null {
  const slots = getSlotsForDate(schedule, visitDate);
  const match = slots.find((slot) => slot.time === time);
  return match ? match.capacity : null;
}
