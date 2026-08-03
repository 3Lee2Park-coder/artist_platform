import { ArtistTalkCard } from "@/components/ArtistTalkCard";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import type { Exhibition } from "@/types/exhibition";

type ArtistTalkSectionProps = {
  exhibitions: Exhibition[];
  remainingById: Record<string, number>;
};

export function ArtistTalkSection({
  exhibitions,
  remainingById
}: ArtistTalkSectionProps) {
  if (exhibitions.length === 0) {
    return null;
  }

  return (
    <section className="home-section artist-talk-section" aria-labelledby="artist-talk-title">
      <HomeSectionHeader
        eyebrow="작가와의 시간"
        title="작가와 함께하는 특별한 전시"
        titleId="artist-talk-title"
        description="작가가 직접 열어둔 대화 시간이 있는 전시입니다. 날짜와 시간을 고르고 예약하세요."
        actionLabel="더보기"
        actionHref="/search?curation=reservable"
      />

      <div className="artist-talk-rail">
        {exhibitions.map((exhibition) => (
          <ArtistTalkCard
            key={exhibition.id}
            exhibition={exhibition}
            remainingSeats={remainingById[exhibition.id] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
