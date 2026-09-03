import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";
import type { CurationStopItem, CurationSummary } from "@/lib/exhibitions";

export const DECK_MAX_CARDS = 7;

export type CardKind = "ARTIST" | "EXHIBITION" | "PLACE";
export type CardRarity = "HIDDEN" | "RARE" | "COMMON";
export type CardSource = "exhibition" | "place" | "space" | "artist";

export type OoofCard = {
  key: string;
  source: CardSource;
  sourceId: string;
  kind: CardKind;
  rarity: CardRarity;
  number: string;
  name: string;
  imageUrl: string | null;
  tone: string | null;
  location: string | null;
  oofNote: string | null;
  oofFact: string | null;
  mood: string | null;
  bestTime: string | null;
  goodFor: string | null;
  address: string | null;
  openingHours: string | null;
  price: string | null;
  whyPicked: string | null;
  href: string | null;
  categoryLabel: string;
  artistName: string | null;
  exhibitionId: string | null;
  placeId: string | null;
  spaceId: string | null;
  artistId: string | null;
  saved?: boolean;
  visited?: boolean;
  visitedAt?: string | null;
  visitedPhotoUrl?: string | null;
};

export function makeCardKey(source: CardSource, id: string) {
  return `${source}:${id}`;
}

export function parseCardKey(key: string): { source: CardSource; id: string } | null {
  const split = key.indexOf(":");
  if (split < 1) return null;
  const source = key.slice(0, split) as CardSource;
  const id = key.slice(split + 1);
  if (!id || !["exhibition", "place", "space", "artist"].includes(source)) {
    return null;
  }
  return { source, id };
}

function inferRarity(badge: string | null | undefined): CardRarity {
  const text = (badge ?? "").toLowerCase();
  if (/숨은|hidden|꼭꼭|골목/.test(text)) return "HIDDEN";
  if (/rare|드문|한정/.test(text)) return "RARE";
  return "COMMON";
}

function splitEditorial(note: string | null | undefined) {
  const text = (note ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { oofNote: null as string | null, oofFact: null as string | null };
  const parts = text.split(/(?<=[.。!?])\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { oofNote: parts[0], oofFact: parts.slice(1).join(" ") };
  }
  return { oofNote: text, oofFact: null as string | null };
}

function formatHours(raw: string | null | undefined) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "{}") return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const parts = Object.entries(parsed)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .slice(0, 4)
      .map(([day, value]) => `${day} ${String(value)}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  } catch {
    return trimmed.length > 72 ? `${trimmed.slice(0, 70)}…` : trimmed;
  }
}

function kindFromStop(stop: CurationStopItem): { kind: CardKind; source: CardSource } {
  if (stop.stopType === "EXHIBITION") {
    return { kind: "EXHIBITION", source: "exhibition" };
  }
  if (stop.stopType === "SPACE" && stop.ownerUserId) {
    return { kind: "ARTIST", source: "space" };
  }
  return { kind: "PLACE", source: stop.stopType === "SPACE" ? "space" : "place" };
}

export function cardFromStop(
  stop: CurationStopItem,
  index: number,
  deck: { subtitle: string | null; situationTags: string[]; durationText: string | null }
): OoofCard {
  const { kind, source } = kindFromStop(stop);
  const editorial = splitEditorial(stop.note);
  const goodFor = deck.situationTags[0] ?? null;

  return {
    key: makeCardKey(source, stop.refId),
    source,
    sourceId: stop.refId,
    kind,
    rarity: inferRarity(stop.editorialBadge),
    number: String(index + 1).padStart(3, "0"),
    name: stop.title,
    imageUrl: stop.heroImageUrl,
    tone: stop.heroTone,
    location: stop.district ?? null,
    oofNote: editorial.oofNote,
    oofFact: editorial.oofFact,
    mood: deck.situationTags.slice(0, 2).join(", ") || null,
    bestTime: deck.durationText,
    goodFor,
    address: stop.address ?? null,
    openingHours: formatHours(stop.openingHours),
    price: null,
    whyPicked: editorial.oofNote || deck.subtitle,
    href: stop.href,
    categoryLabel: stop.categoryLabel ?? kind,
    artistName: stop.artist ?? null,
    exhibitionId: source === "exhibition" ? stop.refId : null,
    placeId: source === "place" ? stop.refId : null,
    spaceId: source === "space" ? stop.refId : null,
    artistId: stop.ownerUserId ?? null
  };
}

export function cardsFromCuration(curation: CurationSummary): OoofCard[] {
  return curation.stops
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, DECK_MAX_CARDS)
    .map((stop, index) =>
      cardFromStop(stop, index, {
        subtitle: curation.subtitle,
        situationTags: curation.situationTags,
        durationText: curation.durationText
      })
    );
}

type VisitRow = {
  exhibitionId: string | null;
  spaceId: string | null;
  placeId: string | null;
  visitedAt: Date;
  photoUrl: string | null;
};

function visitMatches(card: OoofCard, visit: VisitRow) {
  if (card.exhibitionId && visit.exhibitionId === card.exhibitionId) return true;
  if (card.spaceId && visit.spaceId === card.spaceId) return true;
  if (card.placeId && visit.placeId === card.placeId) return true;
  return false;
}

export async function annotateCards(
  cards: OoofCard[],
  userId?: string | null
): Promise<OoofCard[]> {
  if (!userId || cards.length === 0) return cards;

  const keys = cards.map((card) => card.key);
  const exhibitionIds = cards.map((card) => card.exhibitionId).filter(Boolean) as string[];
  const spaceIds = cards.map((card) => card.spaceId).filter(Boolean) as string[];
  const placeIds = cards.map((card) => card.placeId).filter(Boolean) as string[];

  const visitWhere = [
    exhibitionIds.length ? { exhibitionId: { in: exhibitionIds } } : null,
    spaceIds.length ? { spaceId: { in: spaceIds } } : null,
    placeIds.length ? { placeId: { in: placeIds } } : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  let saves: { cardKey: string }[] = [];
  let visits: VisitRow[] = [];
  try {
    [saves, visits] = await Promise.all([
      prisma.savedCard.findMany({
        where: { userId, cardKey: { in: keys } },
        select: { cardKey: true }
      }),
      visitWhere.length
        ? prisma.visit.findMany({
            where: { userId, OR: visitWhere },
            select: {
              exhibitionId: true,
              spaceId: true,
              placeId: true,
              visitedAt: true,
              photoUrl: true
            }
          })
        : Promise.resolve([])
    ]);
  } catch {
    return cards;
  }

  const saved = new Set(saves.map((row) => row.cardKey));

  return cards.map((card) => {
    const visit = visits.find((row) => visitMatches(card, row));
    return {
      ...card,
      saved: saved.has(card.key),
      visited: Boolean(visit),
      visitedAt: visit?.visitedAt.toISOString() ?? null,
      visitedPhotoUrl: resolveMediaUrl(visit?.photoUrl) ?? null
    };
  });
}

export async function resolveCardKeys(keys: string[]): Promise<OoofCard[]> {
  const parsed = keys
    .map((key) => ({ key, parsed: parseCardKey(key) }))
    .filter((item): item is { key: string; parsed: { source: CardSource; id: string } } =>
      Boolean(item.parsed)
    );

  const exhibitionIds = parsed.filter((item) => item.parsed.source === "exhibition").map((item) => item.parsed.id);
  const placeIds = parsed.filter((item) => item.parsed.source === "place").map((item) => item.parsed.id);
  const spaceIds = parsed.filter((item) => item.parsed.source === "space").map((item) => item.parsed.id);

  const [exhibitions, places, spaces] = await Promise.all([
    exhibitionIds.length
      ? prisma.exhibition.findMany({ where: { id: { in: exhibitionIds } } })
      : Promise.resolve([]),
    placeIds.length
      ? prisma.place.findMany({ where: { id: { in: placeIds } } })
      : Promise.resolve([]),
    spaceIds.length
      ? prisma.space.findMany({ where: { id: { in: spaceIds } } })
      : Promise.resolve([])
  ]);

  const exhibitionMap = new Map(exhibitions.map((item) => [item.id, item]));
  const placeMap = new Map(places.map((item) => [item.id, item]));
  const spaceMap = new Map(spaces.map((item) => [item.id, item]));

  return parsed
    .map(({ parsed: item }, index) => {
      if (item.source === "exhibition") {
        const record = exhibitionMap.get(item.id);
        if (!record) return null;
        return {
          key: makeCardKey("exhibition", record.id),
          source: "exhibition" as const,
          sourceId: record.id,
          kind: "EXHIBITION" as const,
          rarity: "COMMON" as const,
          number: String(index + 1).padStart(3, "0"),
          name: record.title,
          imageUrl: resolveMediaUrl(record.heroImageUrl) ?? null,
          tone: record.heroTone,
          location: record.district,
          oofNote: record.summary || null,
          oofFact: null,
          mood: null,
          bestTime: null,
          goodFor: null,
          address: record.address,
          openingHours: null,
          price: null,
          whyPicked: record.summary || null,
          href: `/exhibitions/${record.id}`,
          categoryLabel: "전시",
          artistName: record.artist,
          exhibitionId: record.id,
          placeId: null,
          spaceId: null,
          artistId: record.registeredById
        } satisfies OoofCard;
      }
      if (item.source === "place") {
        const record = placeMap.get(item.id);
        if (!record) return null;
        const editorial = splitEditorial(record.editorialNote ?? record.notes);
        return {
          key: makeCardKey("place", record.id),
          source: "place" as const,
          sourceId: record.id,
          kind: "PLACE" as const,
          rarity: record.homeFeatured ? "HIDDEN" : "COMMON",
          number: String(index + 1).padStart(3, "0"),
          name: record.name,
          imageUrl: resolveMediaUrl(record.imageUrl) ?? null,
          tone: null,
          location: record.district,
          oofNote: editorial.oofNote,
          oofFact: editorial.oofFact,
          mood: null,
          bestTime: null,
          goodFor: null,
          address: record.address,
          openingHours: null,
          price: null,
          whyPicked: editorial.oofNote,
          href: `/places/${record.id}`,
          categoryLabel: record.type,
          artistName: null,
          exhibitionId: null,
          placeId: record.id,
          spaceId: null,
          artistId: null
        } satisfies OoofCard;
      }
      const record = spaceMap.get(item.id);
      if (!record) return null;
      const editorial = splitEditorial(record.shortDescription ?? record.visitNotice);
      return {
        key: makeCardKey("space", record.id),
        source: "space" as const,
        sourceId: record.id,
        kind: record.ownerUserId ? "ARTIST" : "PLACE",
        rarity: "RARE" as const,
        number: String(index + 1).padStart(3, "0"),
        name: record.name,
        imageUrl: resolveMediaUrl(record.heroImageUrl) ?? null,
        tone: record.heroTone,
        location: record.district,
        oofNote: editorial.oofNote,
        oofFact: editorial.oofFact,
        mood: null,
        bestTime: null,
        goodFor: null,
        address: record.address,
        openingHours: formatHours(record.openingHours),
        price: null,
        whyPicked: editorial.oofNote,
        href: `/spaces/${record.slug}`,
        categoryLabel: "공간",
        artistName: null,
        exhibitionId: null,
        placeId: null,
        spaceId: record.id,
        artistId: record.ownerUserId
      } satisfies OoofCard;
    })
    .filter((card) => card !== null);
}

export function displayImage(card: OoofCard) {
  return card.visitedPhotoUrl || card.imageUrl;
}
