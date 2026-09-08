"use client";

import { CurationMapEmbed } from "@/components/CurationMapEmbed";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { ThemePreviewCard } from "@/components/ThemePreviewCard";
import type { CurationSummary } from "@/lib/exhibitions";
import type { Exhibition } from "@/types/exhibition";
import { useEffect, useMemo, useRef, useState } from "react";

function isCoarsePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none)").matches;
}

type SituationalCurationSectionProps = {
  curations: CurationSummary[];
  mapExhibitions: Exhibition[];
};

function routeStopsOf(curation: CurationSummary) {
  const real = curation.stops.filter((stop) => !stop.id.startsWith("legacy-"));
  return real.length > 0 ? real : curation.stops;
}

export function SituationalCurationSection({
  curations,
  mapExhibitions
}: SituationalCurationSectionProps) {
  // 최신 수정순 (홈에서 넘기기 전 보조 정렬)
  const ordered = useMemo(
    () =>
      [...curations].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [curations]
  );

  const [activeId, setActiveId] = useState(ordered[0]?.id ?? "");
  const [coarsePointer, setCoarsePointer] = useState(false);
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const active = ordered.find((item) => item.id === activeId) ?? ordered[0];

  useEffect(() => {
    const media = window.matchMedia("(hover: none)");
    const sync = () => setCoarsePointer(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function selectCuration(id: string) {
    setActiveId(id);
    if (isCoarsePointer()) {
      mapPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  if (ordered.length === 0) {
    return null;
  }

  const mapStops = active ? routeStopsOf(active) : [];

  return (
    <section className="home-section">
      <HomeSectionHeader
        eyebrow="찾기 코스"
        title="못 찾겠다 꾀꼬리!"
        description={
          coarsePointer
            ? "카드를 누르면 지도 동선이 바뀝니다. 같은 카드를 한 번 더 누르거나 코스 보기로 들어가 보세요."
            : "카드에 마우스를 올리면 지도에 동선이 나타납니다. 숨어 있던 전시로 이어지는 길을 골라 보세요."
        }
      />

      <div className="cur-wrap">
        <div className="cur-map-panel" ref={mapPanelRef}>
          {mapStops.length > 0 ? (
            <CurationMapEmbed
              key={active?.id}
              stops={mapStops}
              compact
              pinVariant="compact"
            />
          ) : (
            <CurationMapEmbed
              exhibitions={mapExhibitions}
              compact
              pinVariant="compact"
            />
          )}
        </div>

        <div className="cur-stack">
          {ordered.map((curation) => (
            <div
              key={curation.id}
              className={
                curation.id === active?.id
                  ? "cur-stack-item is-active"
                  : "cur-stack-item"
              }
              aria-current={curation.id === active?.id ? "true" : undefined}
              onMouseEnter={() => {
                if (isCoarsePointer()) return;
                selectCuration(curation.id);
              }}
              onFocus={() => selectCuration(curation.id)}
            >
              <ThemePreviewCard
                label={curation.title}
                description={curation.subtitle ?? curation.description ?? ""}
                href={`/decks/${curation.id}`}
                exhibitions={curation.exhibitions}
                stops={
                  curation.stops.some((stop) => !stop.id.startsWith("legacy-"))
                    ? curation.stops
                    : undefined
                }
                tag="manual"
                compact
                coverImageUrl={curation.coverImageUrl}
                coverTone={curation.coverTone}
                footerLabel="코스 보기"
                selectInsteadOfNavigate={coarsePointer && curation.id !== active?.id}
                onPreview={() => selectCuration(curation.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
