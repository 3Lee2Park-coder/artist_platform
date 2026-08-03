import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const applicationSchema = z.object({
  bio: z.string().min(20, "작가 소개는 20자 이상 작성해주세요."),
  portfolioUrl: z.string().url("올바른 URL을 입력해주세요.").optional().or(z.literal("")),
  activityArea: z.string().min(2, "활동 지역을 입력해주세요.").optional()
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (session.artistStatus === "APPROVED" || session.role === "ARTIST") {
    return NextResponse.json(
      { error: "이미 승인된 작가입니다." },
      { status: 400 }
    );
  }

  if (session.artistStatus === "PENDING") {
    return NextResponse.json(
      { error: "이미 심사 중인 신청이 있습니다." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = applicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { bio, portfolioUrl, activityArea } = parsed.data;

    await prisma.$transaction([
      prisma.artistApplication.upsert({
        where: { userId: session.id },
        update: {
          bio,
          portfolioUrl: portfolioUrl || null,
          activityArea: activityArea || null,
          status: "PENDING"
        },
        create: {
          userId: session.id,
          bio,
          portfolioUrl: portfolioUrl || null,
          activityArea: activityArea || null,
          status: "PENDING"
        }
      }),
      prisma.user.update({
        where: { id: session.id },
        data: { artistStatus: "PENDING" }
      })
    ]);

    return NextResponse.json({ ok: true, status: "PENDING" });
  } catch {
    return NextResponse.json(
      { error: "작가 승인 신청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const application = await prisma.artistApplication.findUnique({
    where: { userId: session.id }
  });

  return NextResponse.json({
    artistStatus: session.artistStatus,
    application
  });
}
