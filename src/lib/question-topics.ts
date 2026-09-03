export const QUESTION_TOPICS = {
  EXHIBITION: "전시",
  ARTWORK: "작품",
  VISIT: "관람·방문"
} as const;

export type QuestionTopic = keyof typeof QUESTION_TOPICS;

export const OPERATOR_UNLISTED_NAME = "작가를 특정하지 않음";

