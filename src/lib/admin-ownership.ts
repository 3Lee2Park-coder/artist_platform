import { prisma } from "@/lib/prisma";

export async function resolveApprovedArtistByEmail(email: string) {
  const normalized = email.trim();
  if (!normalized) {
    return { ok: false as const, error: "이메일을 입력해주세요." };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      name: true,
      artistStatus: true,
      emailVerifiedAt: true
    }
  });

  if (!user) {
    return { ok: false as const, error: "해당 이메일의 사용자를 찾을 수 없습니다." };
  }

  if (!user.emailVerifiedAt) {
    return {
      ok: false as const,
      error: "이메일 인증이 완료된 사용자만 연결할 수 있습니다."
    };
  }

  if (user.artistStatus !== "APPROVED") {
    return {
      ok: false as const,
      error: "승인된 작가만 소유자/등록자로 연결할 수 있습니다."
    };
  }

  return { ok: true as const, user };
}
