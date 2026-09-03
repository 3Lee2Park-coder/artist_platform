"use client";

import { useRef, useState, type PointerEvent } from "react";

const MARKERS = [
  { label: "성수동 골목 공방", x: 28, y: 22, tone: "orange" },
  { label: "연남동 다락방", x: 72, y: 62, tone: "slate" },
  { label: "망원동 지하 작업실", x: 24, y: 76, tone: "blue" },
  { label: "익선동 한옥 갤러리", x: 80, y: 30, tone: "purple" }
] as const;

export function AboutSpotlight() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [isExploring, setIsExploring] = useState(false);

  function revealAtPoint(event: PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;

    const bounds = card.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    card.style.setProperty("--spotlight-x", `${x}%`);
    card.style.setProperty("--spotlight-y", `${y}%`);

    const closest = MARKERS.reduce(
      (result, marker, index) => {
        const distance = Math.hypot(x - marker.x, y - marker.y);
        return distance < result.distance ? { index, distance } : result;
      },
      { index: -1, distance: Number.POSITIVE_INFINITY }
    );

    setActiveMarker(closest.distance < 17 ? closest.index : null);
    setIsExploring(true);
  }

  function revealNextMarker() {
    const nextIndex =
      activeMarker === null ? 0 : (activeMarker + 1) % MARKERS.length;
    const marker = MARKERS[nextIndex];
    const card = cardRef.current;

    card?.style.setProperty("--spotlight-x", `${marker.x}%`);
    card?.style.setProperty("--spotlight-y", `${marker.y}%`);
    setActiveMarker(nextIndex);
    setIsExploring(true);
  }

  return (
    <div
      ref={cardRef}
      className={`about-spotlight${isExploring ? " is-exploring" : ""}`}
      onPointerEnter={() => setIsExploring(true)}
      onPointerMove={revealAtPoint}
      onPointerLeave={() => {
        setActiveMarker(null);
        setIsExploring(false);
      }}
      onClick={revealNextMarker}
      onFocus={() => setIsExploring(true)}
      onBlur={() => {
        setActiveMarker(null);
        setIsExploring(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          revealNextMarker();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="숨겨진 동네 전시 네 곳을 스포트라이트로 찾아보기"
    >
      <div className="about-spotlight-map" aria-hidden="true" />

      <div className="about-spotlight-instruction">
        <span className="about-spotlight-cursor" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m5 3 14 8-6 2-3 6L5 3Z" />
          </svg>
        </span>
        <strong>Explore the Neighborhood</strong>
        <span>마우스를 움직이거나 터치해 숨은 전시를 찾아보세요</span>
      </div>

      {MARKERS.map((marker, index) => (
        <div
          key={marker.label}
          className={`about-art-marker about-art-marker--${marker.tone}${
            activeMarker === index ? " is-revealed" : ""
          }`}
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          aria-hidden="true"
        >
          <span className="about-art-marker-pin">
            <svg viewBox="0 0 24 24">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className="about-art-marker-label">{marker.label}</span>
        </div>
      ))}

      <div className="about-spotlight-overlay" aria-hidden="true" />
      <p className="about-spotlight-caption" aria-hidden="true">
        OOOF. NEIGHBORHOOD ART MAP
      </p>
    </div>
  );
}
