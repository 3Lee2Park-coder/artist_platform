"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  getHeroTabs,
  getRepresentativeExhibition
} from "@/data/exhibitions";
import type { HeroTabKey } from "@/types/exhibition";

const tabLabels: Record<HeroTabKey, string> = {
  today_open: "오늘오픈",
  this_week: "이번주",
  nearby: "근처",
  회화: "회화",
  사진: "사진",
  조각: "조각",
  복합: "복합"
};

export function HomeHeroModule() {
  const tabs = useMemo(() => getHeroTabs(), []);
  const [selectedKey, setSelectedKey] = useState<HeroTabKey>("today_open");
  const exhibition = getRepresentativeExhibition(selectedKey);

  return (
    <section className="home-hero-module" aria-labelledby="hero-title">
      <div className="hero-tabs" aria-label="대표 전시 큐레이션">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === selectedKey ? "hero-tab active" : "hero-tab"}
            onClick={() => setSelectedKey(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <article className="hero-exhibition">
        <div
          className="hero-image"
          style={{ background: exhibition.heroTone }}
          aria-label={`${exhibition.title} 대표 이미지`}
        >
          <span>{tabLabels[selectedKey]}</span>
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
                {exhibition.district} · {exhibition.venue}
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
          <p className="hero-note">
            위 큐레이션 탭은 홈 전체를 바꾸지 않고 이 대표 전시 영역만 변경합니다.
          </p>
        </div>
      </article>
    </section>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}월 ${Number(day)}일`;
}
