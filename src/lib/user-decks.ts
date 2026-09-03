import { annotateCards, DECK_MAX_CARDS, resolveCardKeys, type OoofCard } from "@/lib/cards";
import type { OoofDeck } from "@/lib/decks";
import { displayName } from "@/lib/nickname";
import { prisma } from "@/lib/prisma";

export { DECK_MAX_CARDS };

function toDeck(
  row: {
    id: string;
    title: string;
    subtitle: string | null;
    accentColor: string;
    shareToken: string | null;
    isPublic: boolean;
    updatedAt: Date;
    createdAt: Date;
    user?: { nickname: string | null; name: string } | null;
    cards: { cardKey: string; sortOrder: number }[];
  },
  cards: OoofCard[],
  href: string,
  options?: { publicCover?: boolean }
): OoofDeck {
  const coverCard =
    cards.find((card) => Boolean(card.visitedPhotoUrl || card.imageUrl)) ?? cards[0];
  const cover = options?.publicCover
    ? coverCard?.imageUrl ?? null
    : coverCard?.visitedPhotoUrl || coverCard?.imageUrl || null;
  return {
    id: row.id,
    number: "MY",
    href,
    title: row.title,
    subtitle: row.subtitle,
    curatorNote: row.subtitle,
    location: cards[0]?.location ?? null,
    theme: null,
    coverImageUrl: cover,
    accentColor: row.accentColor,
    cards,
    cardCount: cards.length,
    isCurated: false,
    createdByLabel: row.user ? displayName(row.user) : "MY DECK",
    isFresh: true,
    servable: true,
    updatedAt: row.updatedAt.toISOString(),
    updatedDaysAgo: 0
  };
}

export async function getUserDecks(userId: string): Promise<OoofDeck[]> {
  const rows = await prisma.userDeck.findMany({
    where: { userId },
    include: {
      cards: { orderBy: { sortOrder: "asc" } },
      user: { select: { nickname: true, name: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  return Promise.all(
    rows.map(async (row) => {
      const cards = await annotateCards(
        await resolveCardKeys(row.cards.map((item) => item.cardKey)),
        userId
      );
      return toDeck(row, cards, `/my/decks/${row.id}`);
    })
  );
}

export async function getUserDeckForOwner(userId: string, id: string) {
  const row = await prisma.userDeck.findFirst({
    where: { id, userId },
    include: {
      cards: { orderBy: { sortOrder: "asc" } },
      user: { select: { nickname: true, name: true } }
    }
  });
  if (!row) return null;
  const cards = await annotateCards(
    await resolveCardKeys(row.cards.map((item) => item.cardKey)),
    userId
  );
  return toDeck(row, cards, `/my/decks/${row.id}`);
}

export async function getPublicUserDeck(shareToken: string) {
  const row = await prisma.userDeck.findFirst({
    where: { shareToken, isPublic: true },
    include: {
      cards: { orderBy: { sortOrder: "asc" } },
      user: { select: { nickname: true, name: true } }
    }
  });
  if (!row) return null;
  const annotated = await annotateCards(
    await resolveCardKeys(row.cards.map((item) => item.cardKey)),
    row.userId
  );
  const publicCards = annotated.map((card) => ({
    ...card,
    imageUrl: card.visitedPhotoUrl || card.imageUrl,
    visitedPhotoUrl: null,
    visited: false,
    visitedAt: null,
    saved: false
  }));
  return toDeck(row, publicCards, `/share/decks/${row.shareToken}`);
}

export function summarizeDecks(decks: OoofDeck[]) {
  return decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    cardCount: deck.cardCount
  }));
}
