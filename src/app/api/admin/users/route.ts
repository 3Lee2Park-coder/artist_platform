import { issueEmailVerification } from "@/lib/email-verification";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      artistStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
      phone: true,
      _count: {
        select: {
          exhibitions: true,
          ownedSpaces: true,
          hostedPrograms: true,
          reservations: true
        }
      }
    }
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      artistStatus: user.artistStatus,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      phone: user.phone,
      exhibitionCount: user._count.exhibitions,
      spaceCount: user._count.ownedSpaces,
      programCount: user._count.hostedPrograms,
      reservationCount: user._count.reservations
    }))
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["verify", "resend", "approveArtist"])
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const { id, action } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }

  if (action === "verify") {
    await prisma.user.update({
      where: { id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerifyToken: null,
        emailVerifyExpires: null
      }
    });
    return NextResponse.json({ ok: true, action: "verify" });
  }

  if (action === "approveArtist") {
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "관리자 계정에는 작가 승인을 적용하지 않습니다." },
        { status: 400 }
      );
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "이메일 인증이 끝난 회원만 작가로 승인할 수 있습니다." },
        { status: 400 }
      );
    }

    if (user.artistStatus === "APPROVED" && user.role === "ARTIST") {
      return NextResponse.json({ ok: true, action: "approveArtist", already: true });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { artistStatus: "APPROVED", role: "ARTIST" }
      }),
      prisma.artistApplication.updateMany({
        where: { userId: id },
        data: { status: "APPROVED" }
      })
    ]);

    const existingApplication = await prisma.artistApplication.findUnique({
      where: { userId: id },
      select: { id: true }
    });

    if (!existingApplication) {
      await prisma.artistApplication.create({
        data: {
          userId: id,
          bio: "관리자가 직접 승인한 작가입니다.",
          status: "APPROVED"
        }
      });
    }

    return NextResponse.json({ ok: true, action: "approveArtist" });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "이미 이메일 인증이 완료된 회원입니다." },
      { status: 400 }
    );
  }

  const emailResult = await issueEmailVerification(user.id);
  if (!emailResult.sent) {
    return NextResponse.json(
      {
        ok: false,
        error: emailResult.error ?? "인증 메일 발송에 실패했습니다."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, action: "resend", emailSent: true });
}

const deleteSchema = z.object({
  id: z.string().min(1)
});

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      role: true,
      emailVerifiedAt: true,
      _count: {
        select: {
          exhibitions: true,
          ownedSpaces: true,
          hostedPrograms: true,
          reservations: true,
          saves: true,
          visits: true,
          reviews: true,
          curations: true
        }
      }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "관리자 계정은 삭제할 수 없습니다." },
      { status: 400 }
    );
  }

  const linked =
    user._count.exhibitions +
    user._count.ownedSpaces +
    user._count.hostedPrograms +
    user._count.reservations +
    user._count.saves +
    user._count.visits +
    user._count.reviews +
    user._count.curations;

  if (user.emailVerifiedAt || linked > 0) {
    return NextResponse.json(
      {
        error:
          "인증 완료 회원이거나 콘텐츠/활동이 있는 계정은 삭제할 수 없습니다. 미인증·빈 계정만 삭제하세요."
      },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.artistApplication.deleteMany({ where: { userId: user.id } }),
    prisma.notificationLog.deleteMany({ where: { userId: user.id } }),
    prisma.eventLog.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } })
  ]);

  return NextResponse.json({ ok: true, deleted: true });
}
