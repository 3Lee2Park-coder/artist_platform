import assert from "node:assert/strict";
import test from "node:test";
import type { CurationStopItem, CurationSummary } from "./exhibitions";
import { exhibitionJsonLd } from "./seo";
import { isDeckListable, isExhibitionListable } from "./sitemap-eligibility";

const today = "2026-10-28";

function show(
  endDate: string,
  lifecycleOverride: string | null,
  startDate = "2026-10-01"
) {
  return { startDate, endDate, lifecycleOverride };
}

function stop(partial: Partial<CurationStopItem> & Pick<CurationStopItem, "stopType" | "refId">): CurationStopItem {
  return {
    id: partial.refId,
    sortOrder: 0,
    title: partial.refId,
    subtitle: null,
    href: null,
    externalUrl: null,
    lat: 0,
    lng: 0,
    heroTone: null,
    heroImageUrl: null,
    editorialBadge: null,
    distanceText: null,
    note: null,
    ...partial
  };
}

function deck(stops: CurationStopItem[]): CurationSummary {
  return {
    id: "deck-1",
    title: "테스트 덱",
    subtitle: null,
    description: null,
    storyJson: "[]",
    descriptionImages: [],
    coverTone: "#C46D54",
    coverImageUrl: null,
    featured: false,
    neighborhood: "서울",
    situationTags: [],
    radiusMeters: 1000,
    durationText: null,
    basePlace: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    exhibitions: [],
    stops
  };
}

test("ended exhibition without an override is not listable", () => {
  assert.equal(isExhibitionListable(show("2026-10-27", null), today), false);
});

test("cancelled exhibition is not listable even when endDate is in the future", () => {
  assert.equal(isExhibitionListable(show("2026-12-31", "CANCELLED"), today), false);
});

test("extended exhibition stays listable after endDate because there is no extension end field", () => {
  assert.equal(isExhibitionListable(show("2026-10-01", "EXTENDED"), today), true);
});

test("ongoing, ending soon, and upcoming exhibitions are listable", () => {
  assert.equal(isExhibitionListable(show("2026-11-30", null), today), true);
  assert.equal(isExhibitionListable(show(today, null), today), true);
  assert.equal(
    isExhibitionListable(show("2026-12-31", null, "2026-11-01"), today),
    true
  );
});

test("a deck is listable only when servable", () => {
  assert.equal(isDeckListable(deck([]), today), false);
  assert.equal(
    isDeckListable(
      deck([stop({ stopType: "EXHIBITION", refId: "ex-1", endDate: "2026-10-01" })]),
      today
    ),
    false
  );
  assert.equal(
    isDeckListable(
      deck([stop({ stopType: "EXHIBITION", refId: "ex-2", endDate: "2026-11-01" })]),
      today
    ),
    true
  );
  assert.equal(
    isDeckListable(deck([stop({ stopType: "PLACE", refId: "place-1" })]), today),
    true
  );
});

test("cancelled exhibition JSON-LD uses EventCancelled", () => {
  const cancelled = JSON.stringify(
    exhibitionJsonLd({
      title: "취소된 전시",
      description: "설명",
      canonical: "/exhibitions/cancelled-1",
      venue: "공간",
      lifecycleOverride: "CANCELLED"
    })
  );
  const scheduled = JSON.stringify(
    exhibitionJsonLd({
      title: "예정된 전시",
      description: "설명",
      canonical: "/exhibitions/scheduled-1",
      venue: "공간",
      lifecycle: "ongoing"
    })
  );
  assert.match(cancelled, /https:\/\/schema.org\/EventCancelled/);
  assert.doesNotMatch(cancelled, /EventScheduled/);
  assert.match(scheduled, /https:\/\/schema.org\/EventScheduled/);
  assert.doesNotMatch(scheduled, /EventCancelled/);
});
