import type { SpaceSummary } from "@/lib/spaces";
import Link from "next/link";

type SpaceCardProps = {
  space: SpaceSummary;
  compact?: boolean;
};

export function SpaceCard({ space, compact = false }: SpaceCardProps) {
  const coverStyle = space.heroImageUrl
    ? {
        backgroundImage: `url(${space.heroImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : { background: space.heroTone };

  const hasProgram = space.activeProgramCount > 0;

  return (
    <article className={compact ? "space-card compact" : "space-card"}>
      <Link
        href={`/spaces/${space.slug}`}
        className="space-card-media"
        aria-label={space.name}
      >
        <div className="space-card-cover" style={coverStyle} aria-hidden="true">
          {!space.heroImageUrl ? (
            <span className="space-card-cover-mark" aria-hidden="true">
              {space.name.slice(0, 1)}
            </span>
          ) : null}
        </div>
        <span className={`space-visit-badge tone-${space.visitStatus.tone}`}>
          {space.visitStatus.label}
        </span>
        {hasProgram ? (
          <span className="space-program-badge">
            프로그램 {space.activeProgramCount}
          </span>
        ) : null}
      </Link>

      <div className="space-card-body">
        <p className="space-card-kicker">
          {space.typeLabel} · {space.district}
          {space.floorOrUnit ? ` · ${space.floorOrUnit}` : ""}
        </p>
        <Link href={`/spaces/${space.slug}`} className="space-card-title">
          {space.name}
        </Link>
        {space.owner ? (
          <p className="space-card-artist">
            {space.owner.name}
            {space.owner.discipline ? ` · ${space.owner.discipline}` : ""}
          </p>
        ) : null}
        {!compact && space.shortDescription ? (
          <p className="space-card-desc">{space.shortDescription}</p>
        ) : null}
      </div>
    </article>
  );
}
