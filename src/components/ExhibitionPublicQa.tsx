import { summarizePublicText } from "@/lib/public-questions";
import type { PublicQuestion } from "@/lib/question-intake";

type ExhibitionPublicQaProps = {
  items: PublicQuestion[];
};

/** public 답변 1건+일 때만 부모가 렌더. 빈 상태·목록 링크 없음. */
export function ExhibitionPublicQa({ items }: ExhibitionPublicQaProps) {
  if (items.length === 0) return null;

  return (
    <section className="exhibition-public-qa" aria-label="이 전시에서 궁금했던 것">
      <h2>이 전시에서 궁금했던 것</h2>
      <ul>
        {items.map((item) => {
          const answer = item.answers[0];
          if (!answer) return null;
          return (
            <li key={item.id}>
              <p className="exhibition-public-qa-q">{summarizePublicText(item.text, 90)}</p>
              <p className="exhibition-public-qa-a">{summarizePublicText(answer.text, 120)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
