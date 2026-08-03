import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INTEREST_CATEGORIES, VISIT_PURPOSES } from "@/lib/taste";
import { NextResponse } from "next/server";
import { z } from "zod";

const onboardingSchema = z.object({
  interestTags: z
    .array(z.enum(INTEREST_CATEGORIES))
    .min(1, "관심 분야를 1개 이상 선택해주세요."),
  visitPurposes: z
    .array(z.enum(VISIT_PURPOSES))
    .min(1, "방문 목적을 1개 이상 선택해주세요.")
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.id },
    data: {
      interestTags: JSON.stringify(parsed.data.interestTags),
      visitPurposes: JSON.stringify(parsed.data.visitPurposes),
      onboardedAt: new Date()
    }
  });

  return NextResponse.json({ ok: true });
}
