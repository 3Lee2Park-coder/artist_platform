import type { OoofCard, CardRarity } from "@/lib/cards";
import { placeCardRarity } from "@/lib/cards";
import type { PlaceCard } from "@/lib/places";
import type { Exhibition } from "@/types/exhibition";

function splitEditorial(note: string | null | undefined) {
  const text = (note ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { oofNote: null as string | null, oofFact: null as string | null };
  const parts = text.split(/(?<=[.。!?])\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { oofNote: parts[0], oofFact: parts.slice(1).join(" ") };
  }
  return { oofNote: text, oofFact: null as string | null };
}

export function cardFromPlace(place: PlaceCard, index = 0): OoofCard {
  const editorial = splitEditorial(place.editorialNote ?? place.notes);
  const nearby = place.nearbyExhibition
    ? `${place.nearbyExhibition.title} 곁 (${place.nearbyExhibition.distanceText})`
    : null;

  return {
    key: `place:${place.id}`,
    source: "place",
    sourceId: place.id,
    kind: "PLACE",
    rarity: placeCardRarity(place, "home-hidden"),
    number: String(index + 1).padStart(3, "0"),
    name: place.name,
    imageUrl: place.imageUrl,
    tone: null,
    location: place.district,
    oofNote: editorial.oofNote,
    oofFact: editorial.oofFact ?? nearby,
    mood: null,
    bestTime: null,
    goodFor: nearby,
    address: place.address,
    openingHours: null,
    price: null,
    whyPicked: editorial.oofNote,
    href: `/places/${place.id}`,
    categoryLabel: place.typeLabel,
    artistName: null,
    exhibitionId: null,
    placeId: place.id,
    spaceId: null,
    artistId: null
  };
}

export function exhibitionRarity(exhibition: Exhibition): CardRarity {
  if (exhibition.source === "PUBLIC_API") {
    return exhibition.lifecycle === "ending_soon" ? "RARE" : "COMMON";
  }
  return "RARE";
}

export function cardFromExhibition(exhibition: Exhibition, index = 0): OoofCard {
  const editorial = splitEditorial(exhibition.summary);
  const period = `${exhibition.startDate.slice(5).replace("-", ".")}–${exhibition.endDate.slice(5).replace("-", ".")}`;

  return {
    key: `exhibition:${exhibition.id}`,
    source: "exhibition",
    sourceId: exhibition.id,
    kind: "EXHIBITION",
    rarity: exhibitionRarity(exhibition),
    number: String(index + 1).padStart(3, "0"),
    name: exhibition.title,
    imageUrl: exhibition.heroImageUrl ?? null,
    tone: exhibition.heroTone,
    location: exhibition.district || exhibition.region,
    oofNote: editorial.oofNote,
    oofFact: editorial.oofFact,
    mood: exhibition.categories[0] ?? null,
    bestTime: period,
    goodFor: exhibition.exhibitionType,
    address: exhibition.address || exhibition.venue,
    openingHours: null,
    price: null,
    whyPicked: editorial.oofNote,
    href: `/exhibitions/${exhibition.id}`,
    categoryLabel: exhibition.source === "PUBLIC_API" ? "공공 전시" : "전시",
    artistName: exhibition.artist,
    exhibitionId: exhibition.id,
    placeId: null,
    spaceId: exhibition.space?.id ?? null,
    artistId: exhibition.registeredById ?? null
  };
}
