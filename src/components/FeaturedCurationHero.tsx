"use client";

import type { CurationSummary } from "@/lib/exhibitions";
import Link from "next/link";
import { useMemo, useState } from "react";

type FeaturedCurationHeroProps = {
  curations: CurationSummary[];
};

type NeighborhoodStat = {
  label: string;
  courseCount: number;
  exhibitionCount: number;
};

export function FeaturedCurationHero({ curations }: FeaturedCurationHeroProps) {
  const neighborhoods = useMemo(() => {
    const labels = curations
      .map((item) => item.neighborhood?.trim() || item.exhibitions[0]?.district || "추천")
      .filter(Boolean);
    return Array.from(new Set(labels));
  }, [curations]);

  const neighborhoodStats = useMemo<NeighborhoodStat[]>(() => {
    return neighborhoods.map((label) => {
      const courses = curations.filter((item) => {
        const itemLabel =
          item.neighborhood?.trim() || item.exhibitions[0]?.district || "추천";
        return itemLabel === label;
      });

      return {
        label,
        courseCount: courses.length,
        exhibitionCount: courses.reduce(
          (sum, course) => sum + course.exhibitions.length,
          0
        )
      };
    });
  }, [curations, neighborhoods]);

  const [activeNeighborhood, setActiveNeighborhood] = useState(
    neighborhoods[0] ?? "추천"
  );

  const curatedForTab = useMemo(() => {
    const matched = curations.filter((item) => {
      const label =
        item.neighborhood?.trim() || item.exhibitions[0]?.district || "추천";
      return label === activeNeighborhood;
    });
    return matched.length > 0 ? matched : curations;
  }, [activeNeighborhood, curations]);

  const [slideIndex, setSlideIndex] = useState(0);
  const safeIndex = Math.min(slideIndex, Math.max(curatedForTab.length - 1, 0));
  const curation = curatedForTab[safeIndex] ?? curations[0];

  const activeStat =
    neighborhoodStats.find((item) => item.label === activeNeighborhood) ??
    neighborhoodStats[0];

  if (!curation) {
    return null;
  }

  const coverStyle = curation.coverImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(12,10,8,0.15), rgba(12,10,8,0.55)), url(${curation.coverImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : { background: curation.coverTone };

  function selectNeighborhood(label: string) {
    setActiveNeighborhood(label);
    setSlideIndex(0);
  }

  return (
    <section className="featured-curation-hero" aria-labelledby="featured-course-title">
      <div className="featured-curation-nav" aria-label="지역 코스 선택">
        <div className="featured-curation-nav-copy">
          <p className="featured-curation-nav-kicker">Curated Routes</p>
          <p className="featured-curation-nav-lead">
            <strong>자유 동선형 지역 코스</strong>를 골라 보세요
          </p>
        </div>

        {neighborhoodStats.length > 1 ? (
          <div className="featured-curation-route-rail">
            <div
              className="featured-curation-route-tabs"
              role="tablist"
              aria-label="동네별 코스"
            >
              {neighborhoodStats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  role="tab"
                  aria-selected={stat.label === activeNeighborhood}
                  className={
                    stat.label === activeNeighborhood
                      ? "featured-curation-route-tab active"
                      : "featured-curation-route-tab"
                  }
                  onClick={() => selectNeighborhood(stat.label)}
                >
                  <span className="route-tab-line">
                    <strong className="route-tab-district">{stat.label}</strong>
                    <span className="route-tab-meta">
                      코스 {stat.courseCount} · 전시 {stat.exhibitionCount}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : activeStat ? (
          <div className="featured-curation-route-single" aria-hidden="true">
            <span className="route-tab-line">
              <strong className="route-tab-district">{activeStat.label}</strong>
              <span className="route-tab-meta">
                코스 {activeStat.courseCount} · 전시 {activeStat.exhibitionCount}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="featured-curation-plane" style={coverStyle}>
        <div className="featured-curation-copy">
          <p className="featured-curation-brand">Exhibit</p>
          <p className="featured-curation-eyebrow">
            {activeNeighborhood} · 오늘의 지역 코스
          </p>
          <h1 id="featured-course-title">{curation.title}</h1>
          {curation.subtitle ? (
            <p className="featured-curation-summary">{curation.subtitle}</p>
          ) : curation.description ? (
            <p className="featured-curation-summary">
              {curation.description.split("\n").find((line) => line.trim())}
            </p>
          ) : null}
          <div className="featured-curation-actions">
            <Link className="primary-button" href={`/curations/${curation.id}`}>
              코스 보기
            </Link>
            <span className="featured-curation-count">
              전시 {curation.exhibitions.length}곳
            </span>
            {curatedForTab.length > 1 ? (
              <div className="featured-curation-slide">
                <button
                  type="button"
                  onClick={() =>
                    setSlideIndex(
                      (prev) =>
                        (prev - 1 + curatedForTab.length) % curatedForTab.length
                    )
                  }
                  aria-label="이전 코스"
                >
                  이전
                </button>
                <strong>
                  {safeIndex + 1} / {curatedForTab.length}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    setSlideIndex((prev) => (prev + 1) % curatedForTab.length)
                  }
                  aria-label="다음 코스"
                >
                  다음
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
