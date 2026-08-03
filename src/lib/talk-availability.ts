import { getTodayKST } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  getSlotsForDate,
  parseReservationSchedule,
  type ReservationDay
} from "@/lib/reservation-slots";

function upcomingDates(schedule: ReservationDay[], today: string): string[] {
  const dated = schedule
    .map((day) => day.date)
    .filter((date): date is string => Boolean(date && date >= today));

  return Array.from(new Set(dated)).sort();
}

/** 전시별 남은 대화 예약 좌석 합계 (오늘 이후 일정 기준) */
export async function getTalkRemainingByExhibitionIds(
  exhibitionIds: string[]
): Promise<Record<string, number>> {
  if (exhibitionIds.length === 0) {
    return {};
  }

  const today = getTodayKST();
  const exhibitions = await prisma.exhibition.findMany({
    where: { id: { in: exhibitionIds } },
    select: { id: true, reservationSlots: true }
  });

  const reservations = await prisma.reservation.groupBy({
    by: ["exhibitionId", "visitDate", "slot"],
    where: {
      exhibitionId: { in: exhibitionIds },
      status: "CONFIRMED",
      visitDate: { gte: today }
    },
    _count: { _all: true }
  });

  const bookedMap = new Map<string, number>();
  for (const row of reservations) {
    const key = `${row.exhibitionId}:${row.visitDate}:${row.slot}`;
    bookedMap.set(key, row._count._all);
  }

  const result: Record<string, number> = {};

  for (const exhibition of exhibitions) {
    const schedule = parseReservationSchedule(exhibition.reservationSlots);
    const dates = upcomingDates(schedule, today);
    let remaining = 0;

    if (dates.length > 0) {
      for (const date of dates) {
        for (const slot of getSlotsForDate(schedule, date)) {
          const key = `${exhibition.id}:${date}:${slot.time}`;
          const booked = bookedMap.get(key) ?? 0;
          remaining += Math.max(0, slot.capacity - booked);
        }
      }
    } else {
      // 레거시: 날짜 없는 슬롯은 전 기간 합산
      for (const slot of getSlotsForDate(schedule, today)) {
        const booked = reservations
          .filter((row) => row.exhibitionId === exhibition.id && row.slot === slot.time)
          .reduce((sum, row) => sum + row._count._all, 0);
        remaining += Math.max(0, slot.capacity - booked);
      }
    }

    result[exhibition.id] = remaining;
  }

  return result;
}
