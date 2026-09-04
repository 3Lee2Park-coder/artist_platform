"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarDayItem } from "@/lib/calendar-archive";
import Link from "next/link";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const EXAMPLE_IMAGES = [
  "/brand/hero-hide-and-seek.webp",
  "/brand/ooof-moodbord.png"
];

type Preview = {
  saturday: string;
  sunday: string;
  label: string;
  items: CalendarDayItem[];
};

function cellsForMonth(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= lastDate; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weekendDays(year: number, monthIndex: number) {
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const days: number[] = [];
  for (let day = 1; day <= lastDate; day += 1) {
    const weekday = new Date(year, monthIndex, day).getDay();
    if (weekday === 0 || weekday === 6) days.push(day);
  }
  return days;
}

function MiniCalendar({
  fills,
  caption
}: {
  fills: Map<number, string>;
  caption: string;
}) {
  const cells = useMemo(() => {
    const date = new Date();
    return cellsForMonth(date.getFullYear(), date.getMonth());
  }, []);
  const monthLabel = `${new Date().getMonth() + 1}월`;

  return (
    <div className="weekend-plan-cal">
      <div className="weekend-plan-cal-head">
        <strong>{monthLabel}</strong>
        <span>{caption}</span>
      </div>
      <div className="weekend-plan-cal-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="weekend-plan-cal-grid">
        {cells.map((day, index) => {
          const image = day ? fills.get(day) : undefined;
          const weekday = index % 7;
          return (
            <span
              key={`${day ?? "x"}-${index}`}
              className={[
                "weekend-plan-cal-cell",
                day == null ? "is-empty" : "",
                weekday === 0 || weekday === 6 ? "is-weekend" : "",
                image ? "has-photo" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              style={image ? { backgroundImage: `url(${image})` } : undefined}
            >
              {day ?? ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function WeekendPlanTeaser() {
  const [state, setState] = useState<"guest" | "user">("guest");
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    fetch("/api/my/calendar?weekend=1")
      .then((response) => response.json())
      .then((data) => {
        if (!data.user) {
          setState("guest");
          return;
        }
        setPreview(data.preview ?? null);
        setState("user");
      })
      .catch(() => setState("guest"));
  }, []);

  const coverUrls = (preview?.items ?? [])
    .map((item) => item.imageUrl)
    .filter((url): url is string => Boolean(url));
  const coverKey = coverUrls.join("|");
  const fills = useMemo(() => {
    const map = new Map<number, string>();
    const now = new Date();
    const weekends = weekendDays(now.getFullYear(), now.getMonth());
    const photos = coverKey
      ? coverKey.split("|")
      : EXAMPLE_IMAGES;
    weekends.slice(0, 6).forEach((day, index) => {
      map.set(day, photos[index % photos.length]);
    });
    return map;
  }, [coverKey]);

  return (
    <section className="home-section weekend-plan-teaser" aria-labelledby="weekend-plan-title">
      <div className="weekend-plan-copy">
        <p className="eyebrow">MY CALENDAR</p>
        <h2 id="weekend-plan-title">
          {state === "guest"
            ? "주말 코스를 달력에 먼저 담아 두세요"
            : preview?.items.length
              ? `${preview.label} 코스가 달력에 있습니다`
              : `${preview?.label ?? "다음 주말"} 코스가 아직 비어 있습니다`}
        </h2>
        <p>
          {state === "guest"
            ? "다녀온 날은 사진이 날짜를 채우고, 다음 주말 데이트는 카드와 덱으로 미리 묶어 둘 수 있습니다. 로그인하면 홈에서 바로 다시 열립니다."
            : "홈에 올 때마다 이번 주말 코스가 보여요. 비어 있으면 전시 카드나 나의 덱을 날짜에 올려 보세요."}
        </p>
        <Link className="ooof-btn-fill" href={state === "guest" ? "/auth/login?redirect=/my#day-calendar" : "/my#day-calendar"}>
          {state === "guest" ? "달력 만들기" : preview?.items.length ? "내 달력 열기" : "주말 코스 담기"}
        </Link>
      </div>
      <MiniCalendar
        fills={fills}
        caption={coverUrls.length > 0 ? "이번 달" : "채워진 달력 예시"}
      />
    </section>
  );
}
