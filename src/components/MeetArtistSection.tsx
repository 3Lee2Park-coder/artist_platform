import { ArtistTalkCard } from "@/components/ArtistTalkCard";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { ProgramCard } from "@/components/ProgramCard";
import type { ProgramSummary } from "@/lib/programs";
import type { Exhibition } from "@/types/exhibition";

type MeetArtistSectionProps = {
  programs: ProgramSummary[];
  programRemainingById: Record<string, number>;
  talkExhibitions: Exhibition[];
  talkRemainingById: Record<string, number>;
};

/**
 * 프로그램(공간 이벤트) + 전시 속 작가와의 대화를 한 섹션으로.
 * 초기에 둘 다 적을 때 빈 섹션이 두 줄로 뜨지 않도록 합칩니다.
 */
export function MeetArtistSection({
  programs,
  programRemainingById,
  talkExhibitions,
  talkRemainingById
}: MeetArtistSectionProps) {
  const programPreview = programs.slice(0, 6);
  const talkPreview = talkExhibitions.slice(0, 6);
  const total = programPreview.length + talkPreview.length;

  if (total === 0) {
    return null;
  }

  const actionHref =
    programs.length > 0 ? "/programs" : "/exhibitions?curation=reservable";

  return (
    <section className="home-section meet-artist-section" aria-labelledby="meet-artist-title">
      <HomeSectionHeader
        eyebrow="작가와 만나기"
        title="예약하고, 직접 이야기해 보세요"
        titleId="meet-artist-title"
        description="오픈 스튜디오·워크숍, 전시 안 작가와의 대화를 한곳에 모았습니다. 화면 밖 만남으로 이어집니다."
        actionLabel="더 찾아보기"
        actionHref={actionHref}
      />

      <div className="meet-artist-rail">
        {programPreview.map((program) => (
          <ProgramCard
            key={`program-${program.id}`}
            program={program}
            remainingSeats={programRemainingById[program.id]}
          />
        ))}
        {talkPreview.map((exhibition) => (
          <ArtistTalkCard
            key={`talk-${exhibition.id}`}
            exhibition={exhibition}
            remainingSeats={talkRemainingById[exhibition.id] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
