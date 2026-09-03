import { cardsFromCuration, DECK_MAX_CARDS, type OoofCard } from "@/lib/cards";
import { daysBetweenDates } from "@/lib/dosirak";
import { getTodayKST } from "@/lib/date";
import type { CurationSummary } from "@/lib/exhibitions";

export const DECK_BRAND = {
  unit: "DECK",
  archiveTitle: "DECK",
  tagline: "전시와 그 곁의 장소를 한 번에 둘러보는 카드 코스.",
  homeLabel: "오늘의 발견 코스"
} as const;

export type OoofDeck = {
  id: string;
  number: string;
  href: string;
  title: string;
  subtitle: string | null;
  curatorNote: string | null;
  location: string | null;
  theme: string | null;
  coverImageUrl: string | null;
  accentColor: string;
  cards: OoofCard[];
  cardCount: number;
  isCurated: boolean;
  createdByLabel: string;
  isFresh: boolean;
  servable: boolean;
  updatedAt: string;
  updatedDaysAgo: number;
};

function seriesNumber(order: number) {
  return String(order + 1).padStart(2, "0");
}

function accentFromTone(tone: string) {
  if (tone.includes("#")) {
    const match = tone.match(/#[0-9a-fA-F]{3,8}/);
    if (match) return match[0];
  }
  return "#C46D54";
}

export function curationToDeck(
  curation: CurationSummary,
  order: number,
  today = getTodayKST()
): OoofDeck {
  const cards = cardsFromCuration(curation);
  const updatedDaysAgo = Math.max(
    0,
    daysBetweenDates(curation.updatedAt.slice(0, 10), today) ?? 0
  );
  const hasLiveExhibition = cards.some((card) => {
    if (card.kind !== "EXHIBITION") return false;
    const stop = curation.stops.find((item) => item.refId === card.sourceId);
    if (!stop?.endDate) return true;
    const left = daysBetweenDates(today, stop.endDate);
    return left === null || left >= 0;
  });
  const exhibitionCards = cards.filter((card) => card.kind === "EXHIBITION");

  return {
    id: curation.id,
    number: seriesNumber(order),
    href: `/decks/${curation.id}`,
    title: curation.title,
    subtitle: curation.subtitle,
    curatorNote: curation.subtitle,
    location: curation.neighborhood,
    theme: curation.situationTags[0] ?? null,
    coverImageUrl: curation.coverImageUrl ?? cards[0]?.imageUrl ?? null,
    accentColor: accentFromTone(curation.coverTone),
    cards,
    cardCount: cards.length,
    isCurated: true,
    createdByLabel: "OOOF.",
    isFresh: updatedDaysAgo <= 4,
    servable: cards.length > 0 && (exhibitionCards.length === 0 || hasLiveExhibition),
    updatedAt: curation.updatedAt,
    updatedDaysAgo
  };
}

export function buildCuratedDecks(
  curations: CurationSummary[],
  today = getTodayKST()
): OoofDeck[] {
  const numberById = new Map<string, number>();
  [...curations]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((curation, index) => numberById.set(curation.id, index));

  return curations.map((curation) =>
    curationToDeck(curation, numberById.get(curation.id) ?? 0, today)
  );
}

export function pickTodayDecks(curations: CurationSummary[], limit = 2) {
  const featured = new Set(
    curations.filter((item) => item.featured).map((item) => item.id)
  );
  return buildCuratedDecks(curations)
    .filter((deck) => deck.servable && deck.cardCount > 0)
    .sort((a, b) => {
      const featuredDiff = Number(featured.has(b.id)) - Number(featured.has(a.id));
      if (featuredDiff !== 0) return featuredDiff;
      return a.updatedDaysAgo - b.updatedDaysAgo;
    })
    .slice(0, limit);
}

export type DeckArchiveTab = "latest" | "city" | "mood";

export function groupDecks(decks: OoofDeck[], tab: DeckArchiveTab) {
  if (tab === "city") {
    const byCity = new Map<string, OoofDeck[]>();
    for (const deck of decks) {
      const city = deck.location?.trim() || "그 밖의 동네";
      const list = byCity.get(city) ?? [];
      list.push(deck);
      byCity.set(city, list);
    }
    return [...byCity.entries()].map(([title, items]) => ({ id: title, title, items }));
  }
  if (tab === "mood") {
    const byMood = new Map<string, OoofDeck[]>();
    for (const deck of decks) {
      const mood = deck.theme?.trim() || "CURIOUS";
      const list = byMood.get(mood) ?? [];
      list.push(deck);
      byMood.set(mood, list);
    }
    return [...byMood.entries()].map(([title, items]) => ({ id: title, title, items }));
  }
  const fresh = decks.filter((deck) => deck.isFresh);
  const earlier = decks.filter((deck) => !deck.isFresh);
  const rows = [];
  if (fresh.length) rows.push({ id: "week", title: "THIS WEEK", items: fresh });
  if (earlier.length) rows.push({ id: "earlier", title: "EARLIER", items: earlier });
  return rows;
}

export { DECK_MAX_CARDS };
