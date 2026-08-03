import { ThemePreviewRow } from "@/components/ThemePreviewRow";
import {
  CURATION_STOP_TYPE_LABEL,
  daysUntilEnd,
  type CurationStopItem
} from "@/lib/exhibitions";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";

function placeTypeClass(label: string | null): string {
  if (!label) return "etc";
  if (label.includes("카페")) return "cafe";
  if (label.includes("식당")) return "restaurant";
  if (label.includes("산책")) return "walk";
  return "etc";
}

type ThemePreviewCardProps = {
  label: string;
  description: string;
  href: string;
  exhibitions?: Exhibition[];
  /** stop 기반 큐레이션 — 있으면 전시 대신 동선 정차점 미리보기 */
  stops?: CurationStopItem[];
  tag: "auto" | "manual";
  compact?: boolean;
  showCountdown?: boolean;
  coverImageUrl?: string | null;
  coverTone?: string;
  footerLabel?: string;
};

export function ThemePreviewCard({
  label,
  description,
  href,
  exhibitions = [],
  stops,
  tag,
  compact = false,
  showCountdown = false,
  coverImageUrl,
  coverTone,
  footerLabel = "전체보기"
}: ThemePreviewCardProps) {
  const stopPreview = (stops ?? []).slice(0, 4);
  const useStops = stopPreview.length > 0;
  const exhibitionPreview = exhibitions.slice(0, 3);

  const coverFromStop = stopPreview.find((stop) => stop.heroImageUrl || stop.heroTone);
  const coverStyle = coverImageUrl
    ? {
        backgroundImage: `url(${coverImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : coverFromStop?.heroImageUrl
      ? {
          backgroundImage: `url(${coverFromStop.heroImageUrl})`,
          backgroundSize: "cover" as const,
          backgroundPosition: "center" as const
        }
      : exhibitionPreview[0]?.heroImageUrl
        ? {
            backgroundImage: `url(${exhibitionPreview[0].heroImageUrl})`,
            backgroundSize: "cover" as const,
            backgroundPosition: "center" as const
          }
        : {
            background:
              coverTone ??
              coverFromStop?.heroTone ??
              exhibitionPreview[0]?.heroTone ??
              "var(--surface)"
          };

  return (
    <article className={`theme-card${compact ? " compact" : ""}`}>
      <Link href={href} className="theme-card-cover" style={coverStyle} aria-hidden="true" />
      <Link href={href} className="theme-card-body theme-card-body-link">
        <p className="theme-card-eyebrow">
          <span className={`src-tag ${tag === "auto" ? "auto" : "manual"}`}>
            {tag === "auto" ? "자동" : "수동"}
          </span>
          {label}
        </p>
        <p className="theme-card-desc">{description}</p>
      </Link>

      {useStops ? (
        <div className="theme-card-rows">
          {stopPreview.map((stop, index) => {
            const placeLabel =
              stop.stopType === "PLACE"
                ? stop.subtitle?.split("·")[0]?.trim() || "장소"
                : null;
            const content = (
              <>
                {stop.heroImageUrl ? (
                  <div
                    className="theme-row-thumb"
                    style={{
                      backgroundImage: `url(${stop.heroImageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                    aria-hidden="true"
                  />
                ) : stop.stopType === "PLACE" ? (
                  <div
                    className={`theme-row-thumb theme-row-thumb--place place-${placeTypeClass(placeLabel)}`}
                    aria-hidden="true"
                  >
                    <span className="theme-row-type-label">{placeLabel}</span>
                  </div>
                ) : (
                  <div
                    className="theme-row-thumb theme-row-thumb--fallback"
                    style={{
                      background:
                        stop.heroTone ??
                        "linear-gradient(135deg, #ece7df, #cbc2b4)"
                    }}
                    aria-hidden="true"
                  >
                    <span className="theme-row-type-label">
                      {CURATION_STOP_TYPE_LABEL[stop.stopType]}
                    </span>
                  </div>
                )}
                <div className="theme-row-info">
                  <p className="theme-row-title">
                    <span className="theme-row-order">{index + 1}</span>
                    {stop.title}
                  </p>
                  <p className="theme-row-sub">
                    {stop.stopType === "PLACE"
                      ? placeLabel
                      : CURATION_STOP_TYPE_LABEL[stop.stopType]}
                    {stop.stopType !== "PLACE" && stop.subtitle
                      ? ` · ${stop.subtitle}`
                      : ""}
                  </p>
                </div>
              </>
            );

            return (
              <div key={stop.id} className="theme-row">
                {stop.href ? (
                  <Link href={stop.href} className="theme-row-main">
                    {content}
                  </Link>
                ) : stop.externalUrl ? (
                  <a
                    href={stop.externalUrl}
                    className="theme-row-main"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {content}
                  </a>
                ) : (
                  <div className="theme-row-main">{content}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : exhibitionPreview.length > 0 ? (
        <div className="theme-card-rows">
          {exhibitionPreview.map((exhibition) => (
            <ThemePreviewRow
              key={exhibition.id}
              exhibition={exhibition}
              showCountdown={showCountdown}
              daysLeft={showCountdown ? daysUntilEnd(exhibition.endDate) : null}
            />
          ))}
        </div>
      ) : null}

      <Link href={href} className="theme-card-foot">
        {footerLabel} →
      </Link>
    </article>
  );
}
