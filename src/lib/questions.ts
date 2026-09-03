import { prisma } from "@/lib/prisma";
import {
  OPERATOR_UNLISTED_NAME,
  QUESTION_TOPICS,
  type QuestionTopic
} from "@/lib/question-topics";

export { OPERATOR_UNLISTED_NAME, QUESTION_TOPICS, type QuestionTopic };

const TOPIC_SET = new Set(Object.keys(QUESTION_TOPICS));

const DAILY_LIMIT = 3;

export function isQuestionTopic(value: string): value is QuestionTopic {
  return TOPIC_SET.has(value);
}

export function sanitizeQuestionBody(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export function validateQuestionBody(body: string) {
  if (!body) {
    return "질문을 입력해 주세요.";
  }
  return null;
}

export async function countQuestionsToday(fromEmail: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.artistQuestion.count({
    where: {
      fromEmail: fromEmail.trim().toLowerCase(),
      createdAt: { gte: since }
    }
  });
}

export async function assertQuestionQuota(fromEmail: string) {
  const count = await countQuestionsToday(fromEmail);
  if (count >= DAILY_LIMIT) {
    return "오늘은 질문을 충분히 보내 주셨습니다. 내일 다시 남겨 주세요.";
  }
  return null;
}

export async function getAdminRecipients() {
  return prisma.user.findMany({
    where: { role: "ADMIN", notifyEmail: true },
    select: { id: true, email: true, name: true }
  });
}
