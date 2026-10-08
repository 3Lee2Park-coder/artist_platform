import { prisma } from "@/lib/prisma";
import { toPublicQuestion, type PublicQuestion } from "@/lib/question-intake";

export const PUBLIC_EXHIBITION_QA_LIMIT = 3;

export type PublicQuestionScope = {
  exhibitionId?: string;
  artistId?: string;
  workId?: string;
};

/**
 * visibility=public 답변만. exhibition / artist / work 로 필터 가능.
 * 이후 /asks 허브·작가 Inbox가 같은 where를 재사용하면 된다.
 */
export function publicAnsweredQuestionWhere(scope: PublicQuestionScope) {
  return {
    status: "answered" as const,
    exhibitionId: scope.exhibitionId,
    artistId: scope.artistId,
    workId: scope.workId,
    answers: { some: { visibility: "public" as const } }
  };
}

/** 전시 상세 슬림 블록용. 0건이면 빈 배열 — UI는 블록 자체를 렌더하지 않는다. */
export async function listPublicQuestionsForExhibition(
  exhibitionId: string,
  limit = PUBLIC_EXHIBITION_QA_LIMIT
): Promise<PublicQuestion[]> {
  const take = Math.min(Math.max(limit, 1), PUBLIC_EXHIBITION_QA_LIMIT);
  const rows = await prisma.question.findMany({
    where: publicAnsweredQuestionWhere({ exhibitionId }),
    include: {
      answers: {
        where: { visibility: "public" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          questionId: true,
          responderId: true,
          text: true,
          visibility: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take
  });

  return rows
    .map((row) =>
      toPublicQuestion({
        ...row,
        status: row.status as PublicQuestion["status"],
        audience: row.audience as PublicQuestion["audience"],
        answers: row.answers.map((answer) => ({
          ...answer,
          visibility: answer.visibility as "private" | "public" | "withdrawn"
        }))
      })
    )
    .filter((item) => item.answers.length > 0);
}

export async function setQuestionAnswerVisibility(
  questionId: string,
  visibility: "private" | "public"
) {
  const answer = await prisma.questionAnswer.findFirst({
    where: {
      questionId,
      visibility: { in: ["private", "public"] }
    },
    orderBy: { createdAt: "desc" }
  });
  if (!answer) {
    return { error: "공개할 답변이 없습니다.", status: 404 as const };
  }

  const updated = await prisma.questionAnswer.update({
    where: { id: answer.id },
    data: { visibility }
  });

  return {
    answer: {
      id: updated.id,
      visibility: updated.visibility,
      /** 공개 시각 훅: public으로 바뀐 순간의 updatedAt. 허브 단계에서 publishedAt 컬럼으로 승격 가능. */
      publishedAt: updated.visibility === "public" ? updated.updatedAt.toISOString() : null
    }
  };
}

export function summarizePublicText(text: string, max = 110) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}
