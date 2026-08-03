import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { userId, action } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
  }

  if (action === "reject") {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { artistStatus: "REJECTED" }
      }),
      prisma.artistApplication.updateMany({
        where: { userId },
        data: { status: "REJECTED" }
      })
    ]);

    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { artistStatus: "APPROVED", role: "ARTIST" }
    }),
    prisma.artistApplication.updateMany({
      where: { userId },
      data: { status: "APPROVED" }
    })
  ]);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const applications = await prisma.artistApplication.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ applications });
}
