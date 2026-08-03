import { resolveApprovedArtistByEmail } from "@/lib/admin-ownership";
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

  const exhibitions = await prisma.exhibition.findMany({
    where: { source: { not: "PUBLIC_API" } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      district: true,
      status: true,
      source: true,
      registeredBy: { select: { id: true, name: true, email: true } }
    }
  });

  return NextResponse.json({ exhibitions });
}

const updateSchema = z.object({
  id: z.string().min(1),
  registeredByEmail: z.string().email().nullable().optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "HIDDEN"]).optional()
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const { id, registeredByEmail, ...rest } = parsed.data;

  const existing = await prisma.exhibition.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "전시를 찾을 수 없습니다." }, { status: 404 });
  }

  let registeredByUpdate: { registeredById: string | null } | Record<string, never> =
    {};

  if (registeredByEmail !== undefined) {
    if (registeredByEmail === null || registeredByEmail === "") {
      registeredByUpdate = { registeredById: null };
    } else {
      const resolved = await resolveApprovedArtistByEmail(registeredByEmail);
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      registeredByUpdate = { registeredById: resolved.user.id };
    }
  }

  const exhibition = await prisma.exhibition.update({
    where: { id },
    data: {
      ...rest,
      ...registeredByUpdate
    },
    include: {
      registeredBy: { select: { id: true, name: true, email: true } }
    }
  });

  return NextResponse.json({ exhibition });
}
