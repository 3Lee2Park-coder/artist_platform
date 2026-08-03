"use client";

import type { ProgramSummary } from "@/lib/programs";
import { getAvailableDates, getSlotsForDate } from "@/lib/reservation-slots";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type SlotAvailability = {
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
};

type ProgramReservationWidgetProps = {
  program: ProgramSummary;
  isLoggedIn: boolean;
  userName?: string;
};

export function ProgramReservationWidget({
  program,
  isLoggedIn,
  userName
}: ProgramReservationWidgetProps) {
  const router = useRouter();
  const datedOptions = useMemo(
    () =>
      getAvailableDates(
        program.reservationSchedule,
        program.startDate,
        program.endDate
      ),
    [program.reservationSchedule, program.startDate, program.endDate]
  );

  const [visitDate, setVisitDate] = useState(datedOptions[0] ?? program.startDate);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availability, setAvailability] = useState<SlotAvailability[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fallbackSlots = useMemo(
    () => getSlotsForDate(program.reservationSchedule, visitDate),
    [program.reservationSchedule, visitDate]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      const response = await fetch(
        `/api/reservations?programId=${program.id}&visitDate=${visitDate}`
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

    if (program.reservationRequired && visitDate) {
      void loadAvailability();
    }

    return () => {
      cancelled = true;
    };
  }, [program.id, program.reservationRequired, visitDate]);

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
      router.push(`/auth/login?redirect=/programs/${program.slug}`);
      return;
    }

    if (!selectedSlot) {
      setError("참여 시간을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programId: program.id,
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

    setMessage(`${visitDate} ${selectedSlot} 예약이 확정되었습니다.`);
    router.refresh();
  }

  if (!program.reservationRequired) {
    return (
      <aside id="reservation" className="reservation-widget">
        <p className="eyebrow">{program.typeLabel}</p>
        <h2>참여 안내</h2>
        <div className="reservation-disabled">
          이 프로그램은 예약 없이 운영 시간에 방문해 참여할 수 있습니다.
        </div>
      </aside>
    );
  }

  return (
    <aside id="reservation" className="reservation-widget">
      <p className="eyebrow">{program.typeLabel}</p>
      <h2>프로그램 예약</h2>

      {!isLoggedIn ? (
        <p>
          예약은 회원만 가능합니다.{" "}
          <Link href={`/auth/login?redirect=/programs/${program.slug}`}>로그인</Link>{" "}
          또는 <Link href="/auth/signup">회원가입</Link> 후 이어서 예약합니다.
        </p>
      ) : (
        <p>{userName}님, 참여할 날짜와 시간을 선택해 예약을 확정하세요.</p>
      )}

      <form onSubmit={handleSubmit}>
        <label className="reservation-field">
          참여 날짜
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
              min={program.startDate}
              max={program.endDate}
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
                  <small>{full ? "마감" : `${slot.remaining}/${slot.capacity}석`}</small>
                </button>
              );
            })
          ) : (
            <p className="field-hint">이 날짜에 열린 회차가 없습니다.</p>
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
              ? "예약 확정"
              : "로그인 후 예약하기"}
        </button>
      </form>

      {program.policyNote ? (
        <p className="program-policy-note">{program.policyNote}</p>
      ) : null}
    </aside>
  );
}
