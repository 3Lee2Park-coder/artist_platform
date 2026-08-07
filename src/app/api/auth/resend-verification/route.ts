import { getSession } from "@/lib/auth";
import { issueEmailVerification } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email().optional()
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = bodySchema.safeParse(await request.json().catch(() => ({})));

    const email = body.success ? body.data.email : undefined;
    const user = session
      ? await prisma.user.findUnique({ where: { id: session.id } })
      : email
        ? await prisma.user.findUnique({ where: { email } })
        : null;

    if (!user) {
      return NextResponse.json({ ok: true, message: "요청을 접수했습니다." });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const emailResult = await issueEmailVerification(user.id);

    if (!emailResult.sent) {
      return NextResponse.json(
        {
          ok: false,
          error:
            emailResult.error ??
            "인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, emailSent: true });
  } catch {
    return NextResponse.json(
      { error: "인증 메일 재전송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
