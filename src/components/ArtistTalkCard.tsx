import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";

type ArtistTalkCardProps = {
  exhibition: Exhibition;
  remainingSeats: number;
};

export function ArtistTalkCard({ exhibition, remainingSeats }: ArtistTalkCardProps) {
  const coverStyle = exhibition.heroImageUrl
    ? {
        backgroundImage: `url(${exhibition.heroImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : { background: exhibition.heroTone };

  const isFull = remainingSeats <= 0;

  return (
    <article className="artist-talk-card">
      <Link
        href={`/exhibitions/${exhibition.id}`}
        className="artist-talk-card-media"
        aria-label={exhibition.title}
      >
        <div className="artist-talk-card-poster" style={coverStyle} aria-hidden="true" />
        <span
          className={`artist-talk-seat-badge${isFull ? " full" : ""}`}
          aria-label={isFull ? "예약 마감" : `잔여 ${remainingSeats}석`}
        >
          {isFull ? "마감" : `잔여 ${remainingSeats}석`}
        </span>
      </Link>

      <div className="artist-talk-card-body">
        <p className="artist-talk-card-location">
          {exhibition.district} · {exhibition.venue}
        </p>
        <Link href={`/exhibitions/${exhibition.id}`} className="artist-talk-card-title">
          {exhibition.title}
        </Link>
        <p className="artist-talk-card-artist">{exhibition.artist}</p>
        <Link
          href={`/exhibitions/${exhibition.id}#reservation`}
          className={`artist-talk-card-cta${isFull ? " disabled" : ""}`}
          aria-disabled={isFull}
        >
          {isFull ? "다른 시간 보기" : "대화 예약하기"}
        </Link>
      </div>
    </article>
  );
}
