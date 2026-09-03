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

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { userId, showOnHome } = await request.json();
  if (!userId || typeof showOnHome !== "boolean") {
    return NextResponse.json({ error: "userId와 showOnHome이 필요합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { artistStatus: true }
  });

  if (!user || user.artistStatus !== "APPROVED") {
    return NextResponse.json({ error: "승인된 작가에게만 적용됩니다." }, { status: 400 });
  }

  try {
    await prisma.artistApplication.updateMany({
      where: { userId },
      data: { showOnHome }
    });
  } catch (error) {
    await prisma.$executeRaw`
      UPDATE "ArtistApplication"
      SET "showOnHome" = ${showOnHome}
      WHERE "userId" = ${userId}
    `;
    console.error("admin showOnHome fallback", error);
  }

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
