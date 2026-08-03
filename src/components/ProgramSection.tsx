import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { ProgramCard } from "@/components/ProgramCard";
import type { ProgramSummary } from "@/lib/programs";

type ProgramSectionProps = {
  programs: ProgramSummary[];
  remainingById: Record<string, number>;
};

export function ProgramSection({ programs, remainingById }: ProgramSectionProps) {
  if (programs.length === 0) {
    return null;
  }

  return (
    <section className="home-section" aria-labelledby="program-section-title">
      <HomeSectionHeader
        eyebrow="작가와 시간"
        title="예약할 수 있는 작가 프로그램"
        titleId="program-section-title"
        description="오픈 스튜디오, 작가와의 대화, 워크숍 — 작가를 직접 만나는 시간입니다."
        actionLabel="전체 프로그램"
        actionHref="/programs"
      />

      <div className="program-card-rail">
        {programs.slice(0, 8).map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            remainingSeats={remainingById[program.id]}
          />
        ))}
      </div>
    </section>
  );
}
