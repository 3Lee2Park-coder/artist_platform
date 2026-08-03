import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { ThemePreviewCard } from "@/components/ThemePreviewCard";
import type { PeriodExhibitionGroup } from "@/lib/exhibitions";

type PeriodExhibitionSectionProps = {
  groups: PeriodExhibitionGroup[];
};

export function PeriodExhibitionSection({ groups }: PeriodExhibitionSectionProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="home-section">
      <HomeSectionHeader
        eyebrow="전시 타이밍"
        title="이번 주, 놓치기 아쉬운 전시"
        description="작가 전시부터 곧 끝나는 전시까지, 지금 가보기 좋은 타이밍으로 골랐어요."
        actionLabel="전체 전시"
        actionHref="/exhibitions"
      />

      <div className="period-grid">
        {groups.map((group) => (
          <ThemePreviewCard
            key={group.key}
            label={group.label}
            description={group.description}
            href={group.href}
            exhibitions={group.exhibitions}
            tag={group.tag}
            showCountdown={group.key === "ending_soon"}
            footerLabel="전체보기"
          />
        ))}
      </div>
    </section>
  );
}
