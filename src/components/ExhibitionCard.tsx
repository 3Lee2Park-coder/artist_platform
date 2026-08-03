import { ExhibitionCardActions } from "@/components/ExhibitionCardActions";
import { SOURCE_BADGE } from "@/lib/exhibitions";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";

type ExhibitionCardProps = {
  exhibition: Exhibition;
  compact?: boolean;
  mapCompact?: boolean;
  showActions?: boolean;
};

const LIFECYCLE_LABEL: Partial<Record<Exhibition["lifecycle"], string>> = {
  upcoming: "예정",
  ending_soon: "오늘 종료",
  ended: "종료",
  extended: "연장",
  cancelled: "취소"
};

export function ExhibitionCard({
  exhibition,
  compact = false,
  mapCompact = false,
  showActions = true
}: ExhibitionCardProps) {
  const className = [
    "exhibition-card",
    compact ? "compact" : "",
    mapCompact ? "map-compact" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const badge = SOURCE_BADGE[exhibition.source];
  const lifecycleLabel = LIFECYCLE_LABEL[exhibition.lifecycle];

  return (
    <div className={className}>
      <div className="exhibition-card-media">
        <Link
          className="exhibition-card-link"
          href={`/exhibitions/${exhibition.id}`}
          aria-label={exhibition.title}
        >
          <div
            className="exhibition-card-image"
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
        </Link>
        <div className={`card-badges${mapCompact ? " card-badges-compact" : ""}`}>
          {lifecycleLabel ? (
            <span className={`lifecycle-badge ${exhibition.lifecycle}`}>
              {lifecycleLabel}
            </span>
          ) : (
            <span className={`source-badge ${badge.tone}`}>{badge.label}</span>
          )}
        </div>
        {showActions && !mapCompact ? (
          <ExhibitionCardActions
            exhibitionId={exhibition.id}
            initialSaved={exhibition.saved}
            initialVisited={exhibition.visited}
          />
        ) : null}
      </div>
      <Link className="card-copy" href={`/exhibitions/${exhibition.id}`}>
        <p className="card-location">
          위치 · {exhibition.region} {exhibition.district}
        </p>
        <h3>{exhibition.title}</h3>
        <p>{exhibition.artist}</p>
        <div className="card-footer">
          <span>
            {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
          </span>
          <strong>{exhibition.reservable ? "예약가능" : "관람가능"}</strong>
        </div>
      </Link>
    </div>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}.${Number(day)}`;
}
