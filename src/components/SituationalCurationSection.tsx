"use client";

import { CurationMapEmbed } from "@/components/CurationMapEmbed";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { ThemePreviewCard } from "@/components/ThemePreviewCard";
import type { CurationSummary } from "@/lib/exhibitions";
import type { Exhibition } from "@/types/exhibition";
import { useMemo, useState } from "react";

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
  const active = ordered.find((item) => item.id === activeId) ?? ordered[0];

  if (ordered.length === 0) {
    return null;
  }

  const mapStops = active ? routeStopsOf(active) : [];

  return (
    <section className="home-section">
      <HomeSectionHeader
        eyebrow="찾기 코스"
        title="못 찾겠다 꾀꼬리!"
        description="카드에 마우스를 올리면 지도에 동선이 나타납니다. 숨어 있던 전시로 이어지는 길을 골라 보세요."
      />

      <div className="cur-wrap">
        <div className="cur-map-panel">
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
              onMouseEnter={() => setActiveId(curation.id)}
              onFocus={() => setActiveId(curation.id)}
            >
              <ThemePreviewCard
                label={curation.title}
                description={curation.subtitle ?? curation.description ?? ""}
                href={`/curations/${curation.id}`}
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
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
