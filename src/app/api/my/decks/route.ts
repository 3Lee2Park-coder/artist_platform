import { getSession } from "@/lib/auth";
import { getUserDecks, summarizeDecks } from "@/lib/user-decks";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1).max(40),
  subtitle: z.string().trim().max(80).optional().nullable()
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const decks = await getUserDecks(session.id);
    return NextResponse.json({ decks: summarizeDecks(decks) });
  } catch (error) {
    console.error("getUserDecks", error);
    return NextResponse.json(
      { error: "덱 목록을 불러오지 못했습니다. 데이터베이스 마이그레이션을 확인하세요." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "덱 이름을 적어 주세요." }, { status: 400 });
  }

  try {
    const deck = await prisma.userDeck.create({
      data: {
        userId: session.id,
        title: parsed.data.title,
        subtitle: parsed.data.subtitle ?? null
      },
      include: { _count: { select: { cards: true } } }
    });

    return NextResponse.json({
      deck: {
        id: deck.id,
        title: deck.title,
        cardCount: deck._count.cards
      }
    });
  } catch (error) {
    console.error("createUserDeck", error);
    return NextResponse.json({ error: "덱을 만들지 못했습니다." }, { status: 500 });
  }
}
