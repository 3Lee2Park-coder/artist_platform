import type { Exhibition } from "@/types/exhibition";

type ExhibitionCardProps = {
  exhibition: Exhibition;
  compact?: boolean;
};

export function ExhibitionCard({ exhibition, compact = false }: ExhibitionCardProps) {
  return (
    <article className={compact ? "exhibition-card compact" : "exhibition-card"}>
      <div
        className="exhibition-card-image"
        style={{ background: exhibition.heroTone }}
        aria-hidden="true"
      />
      <div className="card-copy">
        <p className="card-location">위치 · {exhibition.district}</p>
        <h3>{exhibition.title}</h3>
        <p>{exhibition.artist}</p>
        <div className="card-footer">
          <span>
            {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
          </span>
          <strong>{exhibition.reservable ? "예약가능" : "문의필요"}</strong>
        </div>
      </div>
    </article>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}.${Number(day)}`;
}
