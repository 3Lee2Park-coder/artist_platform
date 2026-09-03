import { getSession } from "@/lib/auth";
import { parseCardKey } from "@/lib/cards";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  cardKey: z.string().min(3),
  action: z.enum(["save", "visit"]),
  photoUrl: z.string().min(1).optional()
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const card = parseCardKey(parsed.data.cardKey);
  if (!card) {
    return NextResponse.json({ error: "카드 정보가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "save") {
      await prisma.savedCard.upsert({
        where: {
          userId_cardKey: { userId: session.id, cardKey: parsed.data.cardKey }
        },
        create: { userId: session.id, cardKey: parsed.data.cardKey },
        update: {}
      });

      if (card.source === "exhibition") {
        await prisma.saveExhibition.upsert({
          where: {
            userId_exhibitionId: { userId: session.id, exhibitionId: card.id }
          },
          create: { userId: session.id, exhibitionId: card.id },
          update: {}
        });
        await logEvent({
          type: "SAVE_CREATE",
          userId: session.id,
          exhibitionId: card.id,
          source: "card"
        });
      }

      return NextResponse.json({ saved: true });
    }

    const photoUrl = parsed.data.photoUrl;
    const now = new Date();
    let visit: { visitedAt: Date; photoUrl: string | null };

    if (card.source === "exhibition") {
      visit = await prisma.visit.upsert({
        where: {
          userId_exhibitionId: { userId: session.id, exhibitionId: card.id }
        },
        create: {
          userId: session.id,
          exhibitionId: card.id,
          visitedAt: now,
          photoUrl: photoUrl ?? null
        },
        update: {
          visitedAt: now,
          ...(photoUrl ? { photoUrl } : {})
        }
      });
      await logEvent({
        type: "VISIT_CREATE",
        userId: session.id,
        exhibitionId: card.id,
        source: "card"
      });
    } else if (card.source === "space" || card.source === "artist") {
      visit = await prisma.visit.upsert({
        where: {
          userId_spaceId: { userId: session.id, spaceId: card.id }
        },
        create: {
          userId: session.id,
          spaceId: card.id,
          visitedAt: now,
          photoUrl: photoUrl ?? null
        },
        update: {
          visitedAt: now,
          ...(photoUrl ? { photoUrl } : {})
        }
      });
    } else {
      visit = await prisma.visit.upsert({
        where: {
          userId_placeId: { userId: session.id, placeId: card.id }
        },
        create: {
          userId: session.id,
          placeId: card.id,
          visitedAt: now,
          photoUrl: photoUrl ?? null
        },
        update: {
          visitedAt: now,
          ...(photoUrl ? { photoUrl } : {})
        }
      });
    }

    return NextResponse.json({
      visited: true,
      visitedAt: visit.visitedAt.toISOString(),
      visitedPhotoUrl: resolveMediaUrl(visit.photoUrl) ?? visit.photoUrl
    });
  } catch (error) {
    console.error("card state", error);
    return NextResponse.json(
      { error: "카드 상태를 저장하지 못했습니다. 데이터베이스 마이그레이션을 확인하세요." },
      { status: 503 }
    );
  }
}
