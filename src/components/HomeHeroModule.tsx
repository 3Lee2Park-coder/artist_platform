"use client";

import type { Exhibition, HeroTabKey } from "@/types/exhibition";
import Link from "next/link";
import { useState } from "react";

const tabLabels: Record<HeroTabKey, string> = {
  today_open: "오늘오픈",
  this_week: "이번주",
  upcoming: "전시예정",
  nearby: "근처",
  회화: "회화",
  사진: "사진",
  조각: "조각",
  복합: "복합"
};

type HomeHeroModuleProps = {
  tabs: HeroTabKey[];
  exhibitionsByTab: Record<HeroTabKey, Exhibition[]>;
};

export function HomeHeroModule({ tabs, exhibitionsByTab }: HomeHeroModuleProps) {
  const availableTabs = tabs.filter((tab) => (exhibitionsByTab[tab] ?? []).length > 0);
  const [selectedKey, setSelectedKey] = useState<HeroTabKey>(
    availableTabs[0] ?? tabs[0] ?? "today_open"
  );
  const [slideIndexByTab, setSlideIndexByTab] = useState<Partial<Record<HeroTabKey, number>>>({});
  const resolvedKey =
    (exhibitionsByTab[selectedKey] ?? []).length > 0
      ? selectedKey
      : (availableTabs[0] ?? selectedKey);
  const exhibitions = exhibitionsByTab[resolvedKey] ?? [];
  const currentIndex = Math.min(
    slideIndexByTab[resolvedKey] ?? 0,
    Math.max(exhibitions.length - 1, 0)
  );
  const exhibition = exhibitions[currentIndex];

  if (!exhibition) {
    return null;
  }

  function moveSlide(direction: -1 | 1) {
    setSlideIndexByTab((prev) => {
      const total = exhibitions.length;

      if (total <= 1) {
        return prev;
      }

      const nextIndex = (currentIndex + direction + total) % total;

      return {
        ...prev,
        [resolvedKey]: nextIndex
      };
    });
  }

  return (
    <section className="home-hero-module" aria-labelledby="hero-title">
      <div className="hero-tabs" aria-label="대표 전시 큐레이션">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === selectedKey ? "hero-tab active" : "hero-tab"}
            disabled={(exhibitionsByTab[tab] ?? []).length === 0}
            onClick={() => {
              setSelectedKey(tab);
              setSlideIndexByTab((prev) => ({ ...prev, [tab]: prev[tab] ?? 0 }));
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <article className="hero-exhibition">
        <div
          className="hero-image"
          style={
            exhibition.heroImageUrl
              ? {
                  backgroundImage: `url(${exhibition.heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }
              : { background: exhibition.heroTone }
          }
          aria-label={`${exhibition.title} 대표 이미지`}
        >
          <span>{tabLabels[resolvedKey]}</span>
          {exhibitions.length > 1 ? (
            <div className="hero-slide-controls" aria-label="전시 슬라이드">
              <button type="button" onClick={() => moveSlide(-1)} aria-label="이전 전시">
                이전
              </button>
              <strong>
                {currentIndex + 1} / {exhibitions.length}
              </strong>
              <button type="button" onClick={() => moveSlide(1)} aria-label="다음 전시">
                다음
              </button>
            </div>
          ) : null}
        </div>

        <div className="hero-copy">
          <p className="eyebrow">{exhibition.exhibitionType}</p>
          <h1 id="hero-title">{exhibition.title}</h1>
          <p className="hero-summary">{exhibition.summary}</p>
          <dl className="hero-meta">
            <div>
              <dt>작가</dt>
              <dd>{exhibition.artist}</dd>
            </div>
            <div>
              <dt>장소</dt>
              <dd>
                {exhibition.region} {exhibition.district} · {exhibition.venue}
              </dd>
            </div>
            <div>
              <dt>기간</dt>
              <dd>
                {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
              </dd>
            </div>
          </dl>
          <div className="hero-actions">
            <Link className="primary-button" href={`/exhibitions/${exhibition.id}#reservation`}>
              예약하기
            </Link>
            <Link className="secondary-button" href={`/exhibitions/${exhibition.id}`}>
              상세보기
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}월 ${Number(day)}일`;
}
