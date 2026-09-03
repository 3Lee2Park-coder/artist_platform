import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const NOTICE_TYPES = {
  QUESTION_ANSWER: "QUESTION_ANSWER",
  QUESTION_RECEIVED: "QUESTION_RECEIVED",
  QUESTION_REJECTED: "QUESTION_REJECTED",
  EXHIBITION_ENDING: "EXHIBITION_ENDING"
} as const;

export type NoticeType = (typeof NOTICE_TYPES)[keyof typeof NOTICE_TYPES];

export type NoticeRecord = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function isIgnorable(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2021" || error.code === "P2022";
  }
  return false;
}

/** HMR로 옛 PrismaClient가 남아 있으면 notice 델리게이트가 없다. */
function noticeDb() {
  const notice = (prisma as { notice?: typeof prisma.notice }).notice;
  return notice ?? null;
}

export async function createNotice(input: {
  userId: string;
  type: NoticeType | string;
  title: string;
  body?: string | null;
  href?: string | null;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}) {
  const notice = noticeDb();
  if (!notice) return { created: false };

  try {
    await notice.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        dedupeKey: input.dedupeKey,
        metadata: JSON.stringify(input.metadata ?? {})
      }
    });
    return { created: true };
  } catch (error) {
    if (isIgnorable(error)) {
      return { created: false };
    }
    console.error("createNotice", error);
    return { created: false };
  }
}

export async function listNotices(userId: string, take = 40): Promise<NoticeRecord[]> {
  const notice = noticeDb();
  if (!notice) return [];

  try {
    return await notice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true
      }
    });
  } catch (error) {
    console.error("listNotices", error);
    return [];
  }
}

export async function countUnreadNotices(userId: string) {
  const notice = noticeDb();
  if (!notice) return 0;

  try {
    return await notice.count({
      where: { userId, readAt: null }
    });
  } catch {
    return 0;
  }
}

export async function markNoticeRead(userId: string, id: string) {
  const notice = noticeDb();
  if (!notice) return false;

  try {
    await notice.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() }
    });
    return true;
  } catch (error) {
    console.error("markNoticeRead", error);
    return false;
  }
}

export async function markAllNoticesRead(userId: string) {
  const notice = noticeDb();
  if (!notice) return false;

  try {
    await notice.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });
    return true;
  } catch (error) {
    console.error("markAllNoticesRead", error);
    return false;
  }
}
