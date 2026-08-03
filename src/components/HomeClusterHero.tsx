"use client";

import { CurationMapEmbed } from "@/components/CurationMapEmbed";
import {
  CURATION_STOP_TYPE_LABEL,
  type CurationSummary
} from "@/lib/exhibitions";
import type { SpaceSummary } from "@/lib/spaces";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type HomeClusterHeroProps = {
  spaces: SpaceSummary[];
  curations: CurationSummary[];
};

function routeStopsOf(curation: CurationSummary) {
  const real = curation.stops.filter((stop) => !stop.id.startsWith("legacy-"));
  return real.length > 0 ? real : curation.stops;
}

// 관리자 featured 우선 → 없으면 최신 수정순. 슬라이더로 다른 코스도 탐색
export function HomeClusterHero({ spaces, curations }: HomeClusterHeroProps) {
  const slides = useMemo(() => {
    if (curations.length === 0) return [];
    const featured = curations.filter((item) => item.featured);
    const rest = curations
      .filter((item) => !item.featured)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    return [...featured, ...rest];
  }, [curations]);

  const [index, setIndex] = useState(0);
  const featuredCuration = slides[index] ?? null;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const routeStops = featuredCuration ? routeStopsOf(featuredCuration) : [];
  const previewStops = routeStops;
  const neighborhood =
    featuredCuration?.neighborhood ?? spaces[0]?.district ?? "신당";

  const coverStyle = featuredCuration?.coverImageUrl
    ? {
        backgroundImage: `linear-gradient(105deg, rgba(248,246,241,0.96) 0%, rgba(248,246,241,0.88) 42%, rgba(248,246,241,0.35) 70%, rgba(248,246,241,0.12) 100%), url(${featuredCuration.coverImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }
    : {
        backgroundImage:
          featuredCuration?.coverTone ??
          "linear-gradient(135deg, #f3ece2 0%, #d9c4a8 45%, #6b5644 100%)"
      };

  return (
    <section
      className="home-focus-hero"
      aria-labelledby="home-focus-title"
      style={coverStyle}
    >
      <div className="home-focus-inner">
        <div className="home-focus-copy">
          <p className="home-focus-eyebrow">{neighborhood} · 작가의 공간</p>
          <h1 id="home-focus-title">
            작품이 취향을 만나는 순간
            <br />
            도시를 새롭게 만나다.
          </h1>
          <p className="home-focus-lead">
          공방과 전시를 중심으로, 함께 들르기 좋은 카페와 맛집까지.
          작품을 따라 걷다 보면 어느새 나만의 취향과 새로운 도시를 만나게 됩니다.
          </p>

          <div className="home-focus-actions">
            {featuredCuration ? (
              <Link
                className="primary-button"
                href={`/curations/${featuredCuration.id}`}
              >
                <span className="home-focus-cta-full">
                  {featuredCuration.title} 보기
                </span>
                <span className="home-focus-cta-short">코스 보기</span>
              </Link>
            ) : (
              <Link className="primary-button" href="/spaces">
                공간 둘러보기
              </Link>
            )}
            <Link className="secondary-button" href="/map?layer=curation">
              지도에서 보기
            </Link>
          </div>

          <p className="home-focus-note">
            방문 후 기록은 MY에서 쌓을 수 있습니다.
          </p>
        </div>

        {featuredCuration ? (
          <aside className="home-focus-feature" aria-label="추천 큐레이션">
            <div className="home-focus-feature-head">
              <p className="home-focus-feature-label">
                {featuredCuration.featured ? "추천 코스" : "오늘의 코스"}
                {slides.length > 1 ? ` · ${index + 1}/${slides.length}` : ""}
              </p>
              <Link
                href={`/curations/${featuredCuration.id}`}
                className="home-focus-feature-title"
              >
                {featuredCuration.title}
              </Link>
              {featuredCuration.subtitle ? (
                <p className="home-focus-feature-desc">
                  {featuredCuration.subtitle}
                </p>
              ) : null}
            </div>

            {previewStops.length > 0 ? (
              <ol className="home-focus-stop-list">
                {previewStops.slice(0, 4).map((stop, stopIndex) => (
                  <li key={stop.id}>
                    <span className="home-focus-stop-order">{stopIndex + 1}</span>
                    <div>
                      <p className="home-focus-stop-type">
                        {CURATION_STOP_TYPE_LABEL[stop.stopType]}
                      </p>
                      {stop.href ? (
                        <Link href={stop.href} className="home-focus-stop-name">
                          {stop.title}
                        </Link>
                      ) : (
                        <span className="home-focus-stop-name">{stop.title}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}

            <div className="home-focus-map">
              <CurationMapEmbed
                key={featuredCuration.id}
                stops={previewStops.length > 0 ? previewStops : undefined}
                exhibitions={
                  previewStops.length > 0
                    ? undefined
                    : featuredCuration.exhibitions
                }
                compact
                pinVariant="compact"
              />
            </div>

            {slides.length > 1 ? (
              <div className="home-focus-slider-controls">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setIndex(
                      (prev) => (prev - 1 + slides.length) % slides.length
                    )
                  }
                >
                  이전
                </button>
                <div
                  className="home-focus-dots"
                  role="tablist"
                  aria-label="코스 선택"
                >
                  {slides.map((slide, slideIndex) => (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={slideIndex === index}
                      className={
                        slideIndex === index
                          ? "home-focus-dot is-active"
                          : "home-focus-dot"
                      }
                      onClick={() => setIndex(slideIndex)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
                >
                  다음
                </button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
