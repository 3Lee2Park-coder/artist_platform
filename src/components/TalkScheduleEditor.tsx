"use client";

import type { ReservationDay } from "@/lib/reservation-slots";

type TalkScheduleEditorProps = {
  value: ReservationDay[];
  onChange: (next: ReservationDay[]) => void;
  enabled: boolean;
  startDate?: string;
  endDate?: string;
};

export function TalkScheduleEditor({
  value,
  onChange,
  enabled,
  startDate,
  endDate
}: TalkScheduleEditorProps) {
  function updateDay(index: number, patch: Partial<ReservationDay>) {
    onChange(value.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  function updateSlot(
    dayIndex: number,
    slotIndex: number,
    patch: Partial<ReservationDay["slots"][number]>
  ) {
    onChange(
      value.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          slots: day.slots.map((slot, j) =>
            j === slotIndex ? { ...slot, ...patch } : slot
          )
        };
      })
    );
  }

  function addDay() {
    onChange([
      ...value,
      {
        date: startDate || "",
        slots: [{ time: "14:00", capacity: 10 }]
      }
    ]);
  }

  function removeDay(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addSlot(dayIndex: number) {
    onChange(
      value.map((day, i) =>
        i === dayIndex
          ? { ...day, slots: [...day.slots, { time: "16:00", capacity: 10 }] }
          : day
      )
    );
  }

  function removeSlot(dayIndex: number, slotIndex: number) {
    onChange(
      value.map((day, i) =>
        i === dayIndex
          ? { ...day, slots: day.slots.filter((_, j) => j !== slotIndex) }
          : day
      )
    );
  }

  if (!enabled) {
    return (
      <p className="field-hint">
        온라인 예약을 켜면 날짜별 대화 시간과 정원을 설정할 수 있습니다.
      </p>
    );
  }

  return (
    <div className="talk-schedule-editor">
      <p className="field-hint">
        작가와 대화는 하루만, 또는 여러 날에 나눠 열 수 있습니다. 날짜마다 시간과
        정원을 따로 지정하세요.
      </p>

      {value.length === 0 ? (
        <p className="field-hint">아직 대화 일정이 없습니다. 날짜를 추가해주세요.</p>
      ) : null}

      {value.map((day, dayIndex) => (
        <div key={`day-${dayIndex}`} className="talk-day-card">
          <div className="talk-day-header">
            <label>
              대화 날짜
              <input
                type="date"
                value={day.date ?? ""}
                min={startDate || undefined}
                max={endDate || undefined}
                onChange={(event) => updateDay(dayIndex, { date: event.target.value })}
                required
              />
            </label>
            <button
              type="button"
              className="secondary-button warn-button"
              onClick={() => removeDay(dayIndex)}
            >
              날짜 삭제
            </button>
          </div>

          <div className="talk-slot-list">
            {day.slots.map((slot, slotIndex) => (
              <div key={`slot-${dayIndex}-${slotIndex}`} className="talk-slot-row">
                <label>
                  시간
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(event) =>
                      updateSlot(dayIndex, slotIndex, { time: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  정원
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={slot.capacity}
                    onChange={(event) =>
                      updateSlot(dayIndex, slotIndex, {
                        capacity: Number(event.target.value) || 1
                      })
                    }
                    required
                  />
                </label>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => removeSlot(dayIndex, slotIndex)}
                  disabled={day.slots.length <= 1}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => addSlot(dayIndex)}
          >
            + 시간 추가
          </button>
        </div>
      ))}

      <button type="button" className="secondary-button" onClick={addDay}>
        + 대화 날짜 추가
      </button>
    </div>
  );
}
