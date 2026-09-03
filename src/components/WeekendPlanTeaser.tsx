"use client";

import { useEffect, useState } from "react";
import type { CalendarDayItem } from "@/lib/calendar-archive";
import Link from "next/link";

type Preview = {
  saturday: string;
  sunday: string;
  label: string;
  items: CalendarDayItem[];
};

export function WeekendPlanTeaser() {
  const [state, setState] = useState<"loading" | "guest" | "user">("loading");
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

  if (state === "loading") return null;

  const covers = (preview?.items ?? []).filter((item) => item.imageUrl).slice(0, 4);

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
      <div className="weekend-plan-mosaic" aria-hidden="true">
        {covers.length > 0
          ? covers.map((item) => (
              <span
                key={item.id}
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
            ))
          : [0, 1, 2, 3].map((slot) => <span key={slot} className="is-blank" />)}
      </div>
    </section>
  );
}
