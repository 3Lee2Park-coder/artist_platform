import type { ProgramSummary } from "@/lib/programs";
import Link from "next/link";

type ProgramCardProps = {
  program: ProgramSummary;
  remainingSeats?: number;
};

function formatPeriod(startDate: string, endDate: string) {
  const fmt = (date: string) => {
    const [, month, day] = date.split("-");
    return `${Number(month)}.${Number(day)}`;
  };
  if (startDate === endDate) return fmt(startDate);
  return `${fmt(startDate)}~${fmt(endDate)}`;
}

export function ProgramCard({ program, remainingSeats }: ProgramCardProps) {
  const coverStyle = program.heroImageUrl
    ? {
        backgroundImage: `url(${program.heroImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : { background: program.heroTone };

  const seatsKnown = typeof remainingSeats === "number";
  const isFull = seatsKnown && remainingSeats <= 0;

  return (
    <article className="program-card">
      <Link
        href={`/programs/${program.slug}`}
        className="program-card-media"
        aria-label={program.title}
      >
        <div className="program-card-cover" style={coverStyle} aria-hidden="true" />
        <span className="program-type-badge">{program.typeLabel}</span>
        {program.reservationRequired && seatsKnown ? (
          <span className={`program-seat-badge${isFull ? " full" : ""}`}>
            {isFull ? "예약 마감" : `잔여 ${remainingSeats}석`}
          </span>
        ) : null}
      </Link>

      <div className="program-card-body">
        <p className="program-card-kicker">
          {program.venue.district
            ? `${program.venue.district} · ${program.venue.name}`
            : program.venue.name}
        </p>
        <Link href={`/programs/${program.slug}`} className="program-card-title">
          {program.title}
        </Link>
        <p className="program-card-meta">
          {formatPeriod(program.startDate, program.endDate)}
          {program.nextSlotLabel ? ` · 가까운 회차 ${program.nextSlotLabel}` : ""}
          {program.hostName ? ` · ${program.hostName}` : ""}
        </p>
        <Link
          href={`/programs/${program.slug}`}
          className={`program-card-cta${isFull ? " disabled" : ""}`}
          aria-disabled={isFull}
        >
          {isFull
            ? "다른 회차 보기"
            : program.reservationRequired
              ? "예약하기"
              : "자세히 보기"}
        </Link>
      </div>
    </article>
  );
}
