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
        eyebrow="놓치면 숨어요"
        title="발견된 전시/다시 숨는 전시"
        description="이번 주가 지나면 찾기 어려워질 수 있어요. 아직 모습을 드러낸 전시를 먼저 만나 보세요."
        actionLabel="찾아낸 전시 전체"
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
