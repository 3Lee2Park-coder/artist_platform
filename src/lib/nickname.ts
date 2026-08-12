import { prisma } from "@/lib/prisma";

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]{2,20}$/;

export function normalizeNickname(nickname: string) {
  return nickname.trim().toLowerCase();
}

export function validateNickname(nickname: string): string | null {
  const trimmed = nickname.trim();
  if (!NICKNAME_REGEX.test(trimmed)) {
    return "닉네임은 한글·영문·숫자·_ 2~20자로 입력해주세요.";
  }
  return null;
}

export async function isNicknameTaken(
  nickname: string,
  excludeUserId?: string
) {
  const normalized = normalizeNickname(nickname);
  const existing = await prisma.user.findFirst({
    where: {
      nicknameNormalized: normalized,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {})
    },
    select: { id: true }
  });
  return Boolean(existing);
}

export function displayName(user: {
  nickname?: string | null;
  name: string;
}) {
  const nick = user.nickname?.trim();
  return nick || user.name;
}
