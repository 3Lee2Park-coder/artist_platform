"use client";

import { ExhibitionCard } from "@/components/ExhibitionCard";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";
import { useEffect, useState } from "react";

type HomeHeroSliderProps = {
  /** 작가가 올린 진행 중 전시. 핀이 있으면 앞에, 없으면 최신 등록순. */
  exhibitions: Exhibition[];
};

const AUTOPLAY_MS = 9000;
const CARDS_PER_SLIDE = 3;

type Slide =
  | { key: string; kind: "intro" }
  | { key: string; kind: "exhibitions"; exhibitions: Exhibition[] };

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function buildSlides(exhibitions: Exhibition[]): Slide[] {
  const slides: Slide[] = [{ key: "intro", kind: "intro" }];

  if (exhibitions.length >= 2) {
    chunk(exhibitions.slice(0, CARDS_PER_SLIDE * 2), CARDS_PER_SLIDE)
      .filter((group) => group.length >= 2)
      .forEach((group, groupIndex) => {
        slides.push({
          key: `exhibitions-${groupIndex}`,
          kind: "exhibitions",
          exhibitions: group
        });
      });
  }

  return slides;
}

export function HomeHeroSlider({ exhibitions }: HomeHeroSliderProps) {
  const slides = buildSlides(exhibitions);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const total = slides.length;
  const active = slides[Math.min(index, total - 1)] ?? slides[0];

  useEffect(() => {
    if (total <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [total, paused]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPaused(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <section
      className="home-hero"
      aria-labelledby="home-hero-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="home-hero-stage">
        {active.kind === "intro" ? (
          <div className="home-hero-slide home-hero-intro">
            <div className="home-hero-intro-copy">
              <p className="home-hero-eyebrow">전시를 고르는 가장 쉬운 방법</p>
              <h1 id="home-hero-title">
                오늘, 어디서
                <span>무엇을 볼까요?</span>
              </h1>
              <p className="home-hero-lead">
                OOOF.는 지금 볼 수 있는 전시를 찾고, 전시 전후 함께 들를
                장소까지 하나의 동선으로 이어줍니다.
              </p>
              <ul className="home-hero-points">
                <li>
                  <strong>1</strong> 오늘 볼 전시를 고르고
                </li>
                <li>
                  <strong>2</strong> 주변 장소까지 이어 보고
                </li>
                <li>
                  <strong>3</strong> 나만의 카드로 남겨요
                </li>
              </ul>
              <div className="home-hero-actions">
                <Link className="primary-button" href="/exhibitions">
                  오늘 볼 전시 찾기
                </Link>
                <Link className="secondary-button" href="/decks">
                  추천 동선 보기
                </Link>
              </div>
            </div>
            <div className="home-hero-intro-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/ooof-moodbord.png"
                alt=""
                className="home-hero-intro-image"
                width={667}
                height={800}
              />
              <div className="home-hero-visual-note">
                <span>OOOF.가 이어 드려요</span>
                <strong>전시 하나를 고르면</strong>
                <p>가까운 카페와 작업실, 걷는 순서까지 한눈에.</p>
              </div>
              <div className="home-hero-route" aria-label="전시에서 주변 장소로 이어지는 추천 동선">
                <span>전시</span>
                <i aria-hidden="true">→</i>
                <span>카페</span>
                <i aria-hidden="true">→</i>
                <span>작업실</span>
              </div>
            </div>
          </div>
        ) : null}

        {active.kind === "exhibitions" ? (
          <div className="home-hero-slide home-hero-exhibitions">
            <div className="home-hero-slide-copy">
              <p className="home-hero-eyebrow">오늘 관람할 수 있는 전시</p>
              <h2 className="home-hero-slide-title">
                지금 열려 있는 전시를
                <br className="home-hero-title-break" />
                골라보세요
              </h2>
              <p className="home-hero-lead">
                포스터를 누르면 장소와 기간을 바로 확인할 수 있습니다.
              </p>
              <div className="home-hero-actions">
                <Link className="home-hero-more" href="/exhibitions">
                  전시 전체 보기
                </Link>
              </div>
            </div>
            <div className="home-hero-card-row">
              {active.exhibitions.map((exhibition) => (
                <ExhibitionCard
                  key={exhibition.id}
                  exhibition={exhibition}
                  compact
                  showActions={false}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="home-hero-controls">
          <button
            type="button"
            className="home-hero-arrow"
            aria-label="이전 슬라이드"
            onClick={() => setIndex((prev) => (prev - 1 + total) % total)}
          >
            ‹
          </button>
          <div className="home-hero-dots" role="tablist" aria-label="홈 소개 슬라이드">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.key}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`${slideIndex + 1}번째 슬라이드`}
                className={
                  slideIndex === index ? "home-hero-dot is-active" : "home-hero-dot"
                }
                onClick={() => setIndex(slideIndex)}
              />
            ))}
          </div>
          <button
            type="button"
            className="home-hero-arrow"
            aria-label="다음 슬라이드"
            onClick={() => setIndex((prev) => (prev + 1) % total)}
          >
            ›
          </button>
        </div>
      ) : null}
    </section>
  );
}
