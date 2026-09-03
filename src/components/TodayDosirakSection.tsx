import { DosirakObject } from "@/components/DosirakObject";
import { DosirakTracker } from "@/components/DosirakTracker";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { DOSIRAK_BRAND, pickTodayDosiraks } from "@/lib/dosirak";
import type { CurationSummary } from "@/lib/exhibitions";

type TodayDosirakSectionProps = {
  curations: CurationSummary[];
  limit?: number;
};

export function TodayDosirakSection({
  curations,
  limit = 2
}: TodayDosirakSectionProps) {
  const dosiraks = pickTodayDosiraks(curations, limit);

  if (dosiraks.length === 0) {
    return null;
  }

  return (
    <section
      className="home-section dosirak-section"
      id="today-dosirak"
      aria-labelledby="today-dosirak-title"
    >
      <HomeSectionHeader
        eyebrow="술래가 담아 왔습니다"
        title={DOSIRAK_BRAND.boardLabel}
        titleId="today-dosirak-title"
        description="전시를 가운데 두고, 곁에 둘 카페·산책·공방을 함께 담았습니다."
        actionLabel="도시락 전체"
        actionHref="/curations"
      />

      <div
        className={dosiraks.length > 1 ? "dk-home-pair" : "dk-home-single"}
        aria-label={
          dosiraks.length > 1 ? "오늘의 도시락, 옆으로 넘겨 보세요" : undefined
        }
      >
        {dosiraks.map((dosirak, index) => (
          <article key={dosirak.id} className="dk-home-item">
            <DosirakTracker dosirak={dosirak} surface="home_today">
              <DosirakObject
                dosirak={dosirak}
                defaultOpen={index === 0}
                size="home"
                peekable
              />
            </DosirakTracker>
          </article>
        ))}
      </div>
    </section>
  );
}
