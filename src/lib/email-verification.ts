import {
  buildVerificationEmail,
  getAppUrl,
  sendEmail
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24;

export function createEmailVerifyToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function issueEmailVerification(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerifiedAt: true }
  });

  if (!user || user.emailVerifiedAt) {
    return { sent: false as const, reason: "already_verified" as const };
  }

  const token = createEmailVerifyToken();
  const expires = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyToken: token,
      emailVerifyExpires: expires
    }
  });

  const verifyUrl = getAppUrl(`/auth/verify-email?token=${token}`);
  const template = buildVerificationEmail(user.name, verifyUrl);
  const result = await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });

  if (result.ok) {
    return { sent: true as const };
  }

  if ("skipped" in result && result.skipped) {
    return {
      sent: false as const,
      skipped: true as const,
      error: "메일 발송 설정(RESEND_API_KEY)이 없습니다."
    };
  }

  return {
    sent: false as const,
    error:
      "error" in result && result.error
        ? result.error
        : "인증 메일 발송에 실패했습니다."
  };
}

export async function verifyEmailToken(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpires: { gt: new Date() }
    }
  });

  if (!user) {
    return null;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyExpires: null
    }
  });
}

export async function assertEmailVerified(user: {
  emailVerifiedAt: Date | null;
  role: string;
}) {
  if (user.role === "ADMIN") {
    return true;
  }

  return Boolean(user.emailVerifiedAt);
}
