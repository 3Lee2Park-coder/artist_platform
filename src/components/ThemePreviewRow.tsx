"use client";

import { ExhibitionCardActions } from "@/components/ExhibitionCardActions";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";

type ThemePreviewRowProps = {
  exhibition: Exhibition;
  showCountdown?: boolean;
  daysLeft?: number | null;
};

export function ThemePreviewRow({
  exhibition,
  showCountdown = false,
  daysLeft = null
}: ThemePreviewRowProps) {
  return (
    <div className="theme-row">
      <Link href={`/exhibitions/${exhibition.id}`} className="theme-row-main">
        <div
          className="theme-row-thumb"
          style={
            exhibition.heroImageUrl
              ? {
                  backgroundImage: `url(${exhibition.heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }
              : { background: exhibition.heroTone }
          }
          aria-hidden="true"
        />
        <div className="theme-row-info">
          <p className="theme-row-title">
            {exhibition.title}
            {showCountdown && daysLeft !== null && daysLeft >= 0 ? (
              <span className="badge-soon">D-{daysLeft}</span>
            ) : null}
          </p>
          <p className="theme-row-sub">
            {exhibition.venue} · {exhibition.district}
          </p>
        </div>
      </Link>
      <ExhibitionCardActions
        exhibitionId={exhibition.id}
        initialSaved={exhibition.saved}
        initialVisited={exhibition.visited}
        variant="inline"
      />
    </div>
  );
}
