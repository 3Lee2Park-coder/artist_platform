import { createSession, getSession } from "@/lib/auth";
import {
  isNicknameTaken,
  normalizeNickname,
  validateNickname
} from "@/lib/nickname";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  nickname: z.string().min(2)
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "닉네임을 입력해주세요." }, { status: 400 });
  }

  const nickname = parsed.data.nickname.trim();
  const validationError = validateNickname(nickname);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (await isNicknameTaken(nickname, session.id)) {
    return NextResponse.json(
      { error: "이미 사용 중인 닉네임입니다." },
      { status: 409 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      nickname,
      nicknameNormalized: normalizeNickname(nickname)
    }
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    role: user.role as "MEMBER" | "ARTIST" | "GALLERY" | "ADMIN",
    artistStatus: user.artistStatus as
      | "NONE"
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
  });

  return NextResponse.json({
    nickname: user.nickname
  });
}
