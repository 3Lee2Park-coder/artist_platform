import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const tipSchema = z.object({
  name: z.string().min(1, "장소명을 입력해주세요.").max(80),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  situation: z.enum(["BEFORE", "AFTER", "SOLO", "DATE", "MEAL", "OTHER"]),
  district: z.string().min(1, "동네를 입력해주세요.").max(40),
  imageUrl: z.string().url().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = tipSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const recentCount = await prisma.placeTip.count({
    where: {
      userId: session.id,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (recentCount >= 10) {
    return NextResponse.json(
      { error: "하루 제보 한도를 넘었습니다. 내일 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const data = parsed.data;
  const tip = await prisma.placeTip.create({
    data: {
      userId: session.id,
      name: data.name.trim(),
      sourceUrl: data.sourceUrl || null,
      situation: data.situation,
      district: data.district.trim(),
      imageUrl: data.imageUrl || null,
      status: "PENDING"
    }
  });

  return NextResponse.json({ tip }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const tips = await prisma.placeTip.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return NextResponse.json({ tips });
}
