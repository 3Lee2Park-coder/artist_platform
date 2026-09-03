import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  showOnHome: z.boolean().optional(),
  profileImageUrl: z.string().min(4).nullable().optional()
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !isApprovedArtist(session)) {
    return NextResponse.json({ error: "작가 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const application = await prisma.artistApplication.findUnique({
    where: { userId: session.id }
  });

  if (!application) {
    return NextResponse.json(
      { error: "작가 신청 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const data: { showOnHome?: boolean; profileImageUrl?: string | null } = {};
  if (parsed.data.showOnHome !== undefined) data.showOnHome = parsed.data.showOnHome;
  if (parsed.data.profileImageUrl !== undefined) {
    data.profileImageUrl = parsed.data.profileImageUrl;
  }

  try {
    const updated = await prisma.artistApplication.update({
      where: { userId: session.id },
      data
    });
    return NextResponse.json({
      ok: true,
      application: {
        showOnHome: Boolean(
          (updated as { showOnHome?: boolean }).showOnHome
        ),
        profileImageUrl: updated.profileImageUrl
      }
    });
  } catch (error) {
    if (parsed.data.showOnHome !== undefined) {
      await prisma.$executeRaw`
        UPDATE "ArtistApplication"
        SET "showOnHome" = ${parsed.data.showOnHome}
        WHERE "userId" = ${session.id}
      `;
    }
    if (parsed.data.profileImageUrl !== undefined) {
      await prisma.artistApplication.update({
        where: { userId: session.id },
        data: { profileImageUrl: parsed.data.profileImageUrl }
      });
    }
    console.error("artist-profile patch fallback", error);
    return NextResponse.json({
      ok: true,
      application: {
        showOnHome: parsed.data.showOnHome ?? false,
        profileImageUrl: parsed.data.profileImageUrl ?? application.profileImageUrl
      }
    });
  }
}
