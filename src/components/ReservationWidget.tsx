"use client";

import type { Exhibition } from "@/types/exhibition";
import {
  getAvailableDates,
  getSlotsForDate
} from "@/lib/reservation-slots";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type SlotAvailability = {
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
};

type ReservationWidgetProps = {
  exhibition: Exhibition;
  isLoggedIn: boolean;
  userName?: string;
};

export function ReservationWidget({
  exhibition,
  isLoggedIn,
  userName
}: ReservationWidgetProps) {
  const router = useRouter();
  const datedOptions = useMemo(
    () =>
      getAvailableDates(
        exhibition.reservationSchedule,
        exhibition.startDate,
        exhibition.endDate
      ),
    [exhibition.reservationSchedule, exhibition.startDate, exhibition.endDate]
  );

  const initialDate =
    datedOptions[0] ??
    (exhibition.startDate > new Date().toISOString().slice(0, 10)
      ? exhibition.startDate
      : exhibition.startDate);

  const [visitDate, setVisitDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availability, setAvailability] = useState<SlotAvailability[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fallbackSlots = useMemo(
    () => getSlotsForDate(exhibition.reservationSchedule, visitDate),
    [exhibition.reservationSchedule, visitDate]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      const response = await fetch(
        `/api/reservations?exhibitionId=${exhibition.id}&visitDate=${visitDate}`
      );
      if (!response.ok || cancelled) return;
      const data = await response.json();
      const slots = (data.slots ?? []) as SlotAvailability[];
      setAvailability(slots);
      setSelectedSlot((prev) => {
        if (slots.some((slot) => slot.time === prev && slot.remaining > 0)) {
          return prev;
        }
        return slots.find((slot) => slot.remaining > 0)?.time ?? "";
      });
    }

    if (exhibition.reservable && visitDate) {
      void loadAvailability();
    }

    return () => {
      cancelled = true;
    };
  }, [exhibition.id, exhibition.reservable, visitDate]);

  const displaySlots =
    availability.length > 0
      ? availability
      : fallbackSlots.map((slot) => ({
          time: slot.time,
          capacity: slot.capacity,
          booked: 0,
          remaining: slot.capacity
        }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/exhibitions/${exhibition.id}#reservation`);
      return;
    }

    if (!selectedSlot) {
      setError("예약 시간을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exhibitionId: exhibition.id,
        visitDate,
        slot: selectedSlot
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "예약에 실패했습니다.");
      return;
    }

    setMessage(`${visitDate} ${selectedSlot} 대화 예약이 확정되었습니다.`);
    router.refresh();
  }

  return (
    <aside id="reservation" className="reservation-widget">
      <p className="eyebrow">Artist talk</p>
      <h2>작가와 대화 예약</h2>

      {!isLoggedIn ? (
        <p>
          예약은 회원만 가능합니다.{" "}
          <Link href={`/auth/login?redirect=/exhibitions/${exhibition.id}#reservation`}>
            로그인
          </Link>{" "}
          또는 <Link href="/auth/signup">회원가입</Link> 후 이어서 예약합니다.
        </p>
      ) : (
        <p>{userName}님, 대화 가능한 날짜와 시간을 선택해 예약을 확정하세요.</p>
      )}

      {exhibition.reservable ? (
        <form onSubmit={handleSubmit}>
          <label className="reservation-field">
            대화 날짜
            {datedOptions.length > 0 ? (
              <select
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                disabled={!isLoggedIn}
                required
              >
                {datedOptions.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="date"
                value={visitDate}
                min={exhibition.startDate}
                max={exhibition.endDate}
                onChange={(event) => setVisitDate(event.target.value)}
                disabled={!isLoggedIn}
                required
              />
            )}
          </label>

          <div className="slot-grid" aria-label="예약 가능 시간">
            {displaySlots.length > 0 ? (
              displaySlots.map((slot) => {
                const full = slot.remaining <= 0;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    className={
                      selectedSlot === slot.time ? "slot-button active" : "slot-button"
                    }
                    onClick={() => setSelectedSlot(slot.time)}
                    disabled={!isLoggedIn || full}
                  >
                    <strong>{slot.time}</strong>
                    <small>
                      {full ? "마감" : `${slot.remaining}/${slot.capacity}석`}
                    </small>
                  </button>
                );
              })
            ) : (
              <p className="field-hint">이 날짜에 열린 대화 시간이 없습니다.</p>
            )}
          </div>

          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}

          <button
            type="submit"
            className="primary-button full-width"
            disabled={loading || !selectedSlot}
          >
            {loading
              ? "예약 중..."
              : isLoggedIn
                ? "대화 예약 확정"
                : "로그인 후 예약하기"}
          </button>
        </form>
      ) : (
        <div className="reservation-disabled">
          이 전시는 현재 직접 예약 대신 문의를 통해 방문 가능 여부를 확인합니다.
        </div>
      )}
    </aside>
  );
}
