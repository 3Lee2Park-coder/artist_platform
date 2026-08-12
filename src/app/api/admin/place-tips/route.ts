import { getSession } from "@/lib/auth";
import { buildPlaceTipAdoptedEmail, getAppUrl } from "@/lib/email";
import { displayName } from "@/lib/nickname";
import { sendEmailOnce } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const tips = await prisma.placeTip.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      user: { select: { id: true, name: true, nickname: true, email: true } },
      place: { select: { id: true, name: true } }
    }
  });

  return NextResponse.json({ tips });
}

const adoptSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["adopt", "reject"]),
  adminNote: z.string().optional(),
  // adopt fields — create or link Place
  placeId: z.string().optional(),
  createPlace: z
    .object({
      name: z.string().min(1),
      type: z.enum(["CAFE", "RESTAURANT", "WALK", "ETC"]).default("ETC"),
      region: z.string().default("서울"),
      district: z.string().min(1),
      address: z.string().min(1),
      lat: z.number(),
      lng: z.number(),
      sourceUrl: z.string().optional().or(z.literal("")),
      notes: z.string().optional(),
      editorialNote: z.string().optional(),
      imageUrl: z.string().optional().or(z.literal("")),
      homeFeatured: z.boolean().optional()
    })
    .optional()
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const parsed = adoptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const tip = await prisma.placeTip.findUnique({
    where: { id: parsed.data.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          nickname: true,
          notifyEmail: true
        }
      }
    }
  });

  if (!tip) {
    return NextResponse.json({ error: "제보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (parsed.data.action === "reject") {
    const updated = await prisma.placeTip.update({
      where: { id: tip.id },
      data: {
        status: "REJECTED",
        adminNote: parsed.data.adminNote || null
      }
    });
    return NextResponse.json({ tip: updated });
  }

  let placeId = parsed.data.placeId ?? tip.placeId;

  if (!placeId && parsed.data.createPlace) {
    const data = parsed.data.createPlace;
    const place = await prisma.place.create({
      data: {
        name: data.name,
        type: data.type,
        region: data.region,
        district: data.district,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        sourceUrl: data.sourceUrl || tip.sourceUrl || null,
        notes: data.notes || null,
        editorialNote: data.editorialNote || null,
        imageUrl: data.imageUrl || tip.imageUrl || null,
        homeFeatured: data.homeFeatured ?? false,
        isActive: true,
        tags: "[]"
      }
    });
    placeId = place.id;
  }

  if (!placeId) {
    return NextResponse.json(
      { error: "채택하려면 기존 Place를 연결하거나 새 Place를 만들어 주세요." },
      { status: 400 }
    );
  }

  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) {
    return NextResponse.json({ error: "Place를 찾을 수 없습니다." }, { status: 404 });
  }

  if (tip.imageUrl && !place.imageUrl) {
    await prisma.place.update({
      where: { id: place.id },
      data: { imageUrl: tip.imageUrl }
    });
  }

  const updated = await prisma.placeTip.update({
    where: { id: tip.id },
    data: {
      status: "ADOPTED",
      placeId: place.id,
      adminNote: parsed.data.adminNote || null
    }
  });

  if (tip.user.notifyEmail) {
    const mail = buildPlaceTipAdoptedEmail({
      name: displayName(tip.user),
      placeName: place.name,
      placeUrl: getAppUrl(`/places/${place.id}`)
    });
    await sendEmailOnce({
      userId: tip.user.id,
      type: "PLACE_TIP_ADOPTED",
      dedupeKey: tip.id,
      to: tip.user.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text
    });
  }

  return NextResponse.json({ tip: updated, placeId: place.id });
}
