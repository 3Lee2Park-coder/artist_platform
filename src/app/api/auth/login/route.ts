import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 확인해주세요." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    if (!user.emailVerifiedAt && user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "이메일 인증이 필요합니다. 메일함을 확인하거나 인증 메일을 다시 요청해주세요.",
          requiresVerification: true,
          email: user.email
        },
        { status: 403 }
      );
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "MEMBER" | "ARTIST" | "ADMIN",
      artistStatus: user.artistStatus as "NONE" | "PENDING" | "APPROVED" | "REJECTED"
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        artistStatus: user.artistStatus
      }
    });
  } catch {
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
