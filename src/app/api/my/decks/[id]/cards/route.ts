import { getSession } from "@/lib/auth";
import { DECK_MAX_CARDS, parseCardKey } from "@/lib/cards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const addSchema = z.object({
  cardKey: z.string().min(3)
});

const reorderSchema = z.object({
  cardKeys: z.array(z.string().min(3)).max(DECK_MAX_CARDS)
});

type RouteContext = { params: Promise<{ id: string }> };

async function ownedDeck(userId: string, id: string) {
  return prisma.userDeck.findFirst({
    where: { id, userId },
    include: { cards: { orderBy: { sortOrder: "asc" } } }
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const deck = await ownedDeck(session.id, id);
  if (!deck) {
    return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
  }

  const parsed = addSchema.safeParse(await request.json());
  if (!parsed.success || !parseCardKey(parsed.data.cardKey)) {
    return NextResponse.json({ error: "카드 정보가 올바르지 않습니다." }, { status: 400 });
  }

  if (deck.cards.some((card) => card.cardKey === parsed.data.cardKey)) {
    return NextResponse.json({ ok: true, alreadyInDeck: true });
  }

  if (deck.cards.length >= DECK_MAX_CARDS) {
    return NextResponse.json(
      {
        error: "이 덱이 꽉 찼어요. 새 덱을 만들어볼까요?",
        code: "DECK_FULL"
      },
      { status: 409 }
    );
  }

  await prisma.userDeckCard.create({
    data: {
      deckId: id,
      cardKey: parsed.data.cardKey,
      sortOrder: deck.cards.length
    }
  });

  await prisma.savedCard.upsert({
    where: { userId_cardKey: { userId: session.id, cardKey: parsed.data.cardKey } },
    create: { userId: session.id, cardKey: parsed.data.cardKey },
    update: {}
  });

  return NextResponse.json({
    ok: true,
    cardCount: deck.cards.length + 1
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const deck = await ownedDeck(session.id, id);
  if (!deck) {
    return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
  }

  const parsed = reorderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "순서를 확인하세요." }, { status: 400 });
  }

  const ownedKeys = new Set(deck.cards.map((card) => card.cardKey));
  if (parsed.data.cardKeys.some((key) => !ownedKeys.has(key))) {
    return NextResponse.json({ error: "이 덱에 없는 카드가 있습니다." }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.cardKeys.map((cardKey, index) =>
      prisma.userDeckCard.update({
        where: { deckId_cardKey: { deckId: id, cardKey } },
        data: { sortOrder: index }
      })
    )
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const deck = await ownedDeck(session.id, id);
  if (!deck) {
    return NextResponse.json({ error: "덱을 찾을 수 없습니다." }, { status: 404 });
  }

  const url = new URL(request.url);
  const cardKey = url.searchParams.get("cardKey");
  if (!cardKey) {
    return NextResponse.json({ error: "카드를 지정하세요." }, { status: 400 });
  }

  await prisma.userDeckCard.deleteMany({
    where: { deckId: id, cardKey }
  });

  return NextResponse.json({ ok: true });
}
