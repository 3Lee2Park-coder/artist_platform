import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

type LogNotificationInput = {
  userId: string;
  type: string;
  dedupeKey: string;
  channel?: string;
  exhibitionId?: string;
  reservationId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

export async function hasNotificationBeenSent(input: {
  userId: string;
  type: string;
  dedupeKey: string;
  channel?: string;
}) {
  const existing = await prisma.notificationLog.findUnique({
    where: {
      userId_type_dedupeKey_channel: {
        userId: input.userId,
        type: input.type,
        dedupeKey: input.dedupeKey,
        channel: input.channel ?? "email"
      }
    }
  });

  return Boolean(existing);
}

export async function logNotification(input: LogNotificationInput) {
  return prisma.notificationLog.create({
    data: {
      userId: input.userId,
      type: input.type,
      dedupeKey: input.dedupeKey,
      channel: input.channel ?? "email",
      exhibitionId: input.exhibitionId ?? null,
      reservationId: input.reservationId ?? null,
      status: input.status ?? "sent",
      metadata: JSON.stringify(input.metadata ?? {})
    }
  });
}

export async function sendEmailOnce(input: {
  userId: string;
  type: string;
  dedupeKey: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  exhibitionId?: string;
  reservationId?: string;
}) {
  if (
    await hasNotificationBeenSent({
      userId: input.userId,
      type: input.type,
      dedupeKey: input.dedupeKey
    })
  ) {
    return { sent: false as const, reason: "duplicate" as const };
  }

  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  if (!result.ok) {
    if ("skipped" in result && result.skipped) {
      return { sent: false as const, reason: "skipped" as const };
    }

    await logNotification({
      userId: input.userId,
      type: input.type,
      dedupeKey: input.dedupeKey,
      exhibitionId: input.exhibitionId,
      reservationId: input.reservationId,
      status: "failed",
      metadata: { error: "error" in result ? result.error : "unknown" }
    });

    return { sent: false as const, reason: "failed" as const };
  }

  await logNotification({
    userId: input.userId,
    type: input.type,
    dedupeKey: input.dedupeKey,
    exhibitionId: input.exhibitionId,
    reservationId: input.reservationId,
    status: "sent"
  });

  return { sent: true as const };
}
