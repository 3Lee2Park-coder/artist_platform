import { issueEmailVerification } from "@/lib/email-verification";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  name: z.string().min(2, "이름을 입력해주세요."),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식(YYYY-MM-DD)을 확인해주세요."),
  phone: z.string().optional()
}).superRefine((data, ctx) => {
  const phone = data.phone?.trim();
  if (phone && !/^01[0-9]-?\d{3,4}-?\d{4}$/.test(phone)) {
    ctx.addIssue({
      code: "custom",
      message: "휴대폰 번호 형식을 확인해주세요.",
      path: ["phone"]
    });
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { email, password, name, birthDate, phone } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        birthDate,
        phone: phone?.replace(/-/g, "") || null
      }
    });

    const emailResult = await issueEmailVerification(user.id);

    return NextResponse.json({
      requiresVerification: true,
      emailSent: emailResult.sent,
      emailError: emailResult.sent ? undefined : emailResult.error,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch {
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
