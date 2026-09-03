import { getTodayKST } from "@/lib/date";
import {
  buildEndingSoonEmail,
  getAppUrl
} from "@/lib/email";
import { createNotice, NOTICE_TYPES } from "@/lib/notices";
import { sendEmailOnce } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const REMINDER_DAYS = [7, 3, 1] as const;

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00+09:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export async function sendEndingSoonNotifications() {
  const today = getTodayKST();
  const summary = {
    checked: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    noticed: 0
  };

  for (const daysLeft of REMINDER_DAYS) {
    const targetEndDate = addDays(today, daysLeft);

    const saves = await prisma.saveExhibition.findMany({
      where: {
        exhibition: {
          status: "PUBLISHED",
          endDate: targetEndDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            notifyEmail: true,
            notifyEndingSoon: true,
            emailVerifiedAt: true
          }
        },
        exhibition: {
          select: {
            id: true,
            title: true,
            endDate: true
          }
        }
      }
    });

    for (const save of saves) {
      summary.checked += 1;

      const { user, exhibition } = save;
      if (!user.notifyEndingSoon) {
        summary.skipped += 1;
        continue;
      }

      const visited = await prisma.visit.findUnique({
        where: {
          userId_exhibitionId: {
            userId: user.id,
            exhibitionId: exhibition.id
          }
        }
      });

      if (visited) {
        summary.skipped += 1;
        continue;
      }

      const dedupeKey = `${exhibition.id}:d${daysLeft}:${targetEndDate}`;
      const notice = await createNotice({
        userId: user.id,
        type: NOTICE_TYPES.EXHIBITION_ENDING,
        title: `「${exhibition.title}」 종료 ${daysLeft}일 전`,
        body: `${exhibition.endDate}에 끝납니다. 아직 안 가 봤다면 지금이 마지막에 가깝습니다.`,
        href: `/exhibitions/${exhibition.id}`,
        dedupeKey: `ending:${dedupeKey}`
      });
      if (notice.created) summary.noticed += 1;

      if (!user.notifyEmail || !user.emailVerifiedAt) {
        summary.skipped += 1;
        continue;
      }

      const template = buildEndingSoonEmail({
        name: user.name,
        exhibitionTitle: exhibition.title,
        endDate: exhibition.endDate,
        daysLeft,
        detailUrl: getAppUrl(`/exhibitions/${exhibition.id}`)
      });

      const result = await sendEmailOnce({
        userId: user.id,
        type: "EXHIBITION_ENDING_SOON",
        dedupeKey,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        exhibitionId: exhibition.id
      });

      if (result.sent) {
        summary.sent += 1;
      } else if (result.reason === "duplicate" || result.reason === "skipped") {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  return summary;
}
