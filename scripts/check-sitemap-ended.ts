/**
 * Read-only check that sitemap and llms omit ended exhibitions and unservable decks.
 * Usage: npx tsx scripts/check-sitemap-ended.ts
 * SITEMAP_BASE defaults to http://127.0.0.1:3010
 */
import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import type { CurationStopItem, CurationSummary } from "../src/lib/exhibitions";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
  }
  throw new Error("DATABASE_URL is missing");
}

function deckStop(
  partial: Partial<CurationStopItem> & Pick<CurationStopItem, "stopType" | "refId" | "sortOrder">
): CurationStopItem {
  return {
    id: partial.refId,
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

async function loadPublishedDecks(prisma: PrismaClient): Promise<CurationSummary[]> {
  const rows = await prisma.curation.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      stops: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          stopType: true,
          exhibition: { select: { id: true, status: true, endDate: true } },
          place: { select: { id: true } },
          space: { select: { id: true, status: true, isPublic: true } }
        }
      },
      exhibitions: {
        orderBy: { sortOrder: "asc" },
        select: { exhibition: { select: { id: true, status: true, endDate: true } } }
      }
    }
  });

  return rows.map((row) => {
    let stops = row.stops.flatMap((stop): CurationStopItem[] => {
      if (stop.stopType === "EXHIBITION" && stop.exhibition?.status === "PUBLISHED") {
        return [
          deckStop({
            stopType: "EXHIBITION",
            refId: stop.exhibition.id,
            sortOrder: stop.sortOrder,
            endDate: stop.exhibition.endDate
          })
        ];
      }
      if (stop.stopType === "PLACE" && stop.place) {
        return [deckStop({ stopType: "PLACE", refId: stop.place.id, sortOrder: stop.sortOrder })];
      }
      if (stop.stopType === "SPACE" && stop.space?.status === "PUBLISHED" && stop.space.isPublic) {
        return [deckStop({ stopType: "SPACE", refId: stop.space.id, sortOrder: stop.sortOrder })];
      }
      return [];
    });
    if (stops.length === 0) {
      stops = row.exhibitions.flatMap((item, index) =>
        item.exhibition.status === "PUBLISHED"
          ? [
              deckStop({
                stopType: "EXHIBITION",
                refId: item.exhibition.id,
                sortOrder: index,
                endDate: item.exhibition.endDate
              })
            ]
          : []
      );
    }
    return {
      id: row.id,
      title: row.title,
      subtitle: null,
      description: null,
      storyJson: "[]",
      descriptionImages: [],
      coverTone: "#C46D54",
      coverImageUrl: null,
      featured: false,
      neighborhood: null,
      situationTags: [],
      radiusMeters: 0,
      durationText: null,
      basePlace: null,
      createdAt: row.updatedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      exhibitions: [],
      stops
    };
  });
}

const base = (process.env.SITEMAP_BASE || "http://127.0.0.1:3010").replace(/\/$/, "");
const watch = [
  "cmuxh00ed0001fh4j3qlf6oww",
  "blue-bird",
  "exhibition-1791354050158"
];

function idsIn(text: string, kind: "exhibitions" | "decks") {
  const found = new Set<string>();
  const pattern = new RegExp(`/${kind}/([^\\s<"')]+)`, "g");
  for (const match of text.matchAll(pattern)) {
    const id = match[1].replace(/\.md$/, "");
    if (!id || id.endsWith(".md")) continue;
    found.add(id);
  }
  return found;
}

function countLocs(xml: string) {
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const counts = {
    home: 0,
    static: 0,
    exhibition: 0,
    deck: 0,
    space: 0,
    program: 0,
    artist: 0,
    place: 0
  };
  for (const loc of locs) {
    const path = loc.replace(/^https?:\/\/[^/]+/, "") || "/";
    if (path === "/") counts.home += 1;
    else if (path.startsWith("/exhibitions/")) counts.exhibition += 1;
    else if (path.startsWith("/decks/")) counts.deck += 1;
    else if (path.startsWith("/spaces/")) counts.space += 1;
    else if (path.startsWith("/programs/")) counts.program += 1;
    else if (path.startsWith("/artists/")) counts.artist += 1;
    else if (path.startsWith("/places/")) counts.place += 1;
    else counts.static += 1;
  }
  return { total: locs.length, counts };
}

async function main() {
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl();
  const [{ prisma }, { computeLifecycle }, { getTodayKST }, { isDeckListable }] =
    await Promise.all([
      import("../src/lib/prisma"),
      import("../src/lib/exhibitions"),
      import("../src/lib/date"),
      import("../src/lib/sitemap-eligibility")
    ]);

  const [sitemap, llmsTxt, decksMd, exhibitionsMd] = await Promise.all(
    ["/sitemap.xml", "/llms.txt", "/llms/decks.md", "/llms/exhibitions.md"].map(async (path) => {
      const response = await fetch(`${base}${path}`);
      if (!response.ok) throw new Error(`${path} ${response.status}`);
      return response.text();
    })
  );

  const today = getTodayKST();
  const { total, counts } = countLocs(sitemap);
  const sitemapExhibitions = idsIn(sitemap, "exhibitions");
  const sitemapDecks = idsIn(sitemap, "decks");
  const llmsTxtDecks = idsIn(llmsTxt, "decks");
  const decksMdIds = idsIn(decksMd, "decks");
  const llmsExhibitions = idsIn(exhibitionsMd, "exhibitions");

  const rows = await prisma.exhibition.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, endDate: true, startDate: true, lifecycleOverride: true }
  });
  const tally: Record<string, { total: number; inSitemap: number; inLlms: number }> = {};
  function bump(key: string, id: string) {
    const row = tally[key] ?? { total: 0, inSitemap: 0, inLlms: 0 };
    row.total += 1;
    if (sitemapExhibitions.has(id)) row.inSitemap += 1;
    if (llmsExhibitions.has(id)) row.inLlms += 1;
    tally[key] = row;
  }
  let sitemapEnded = 0;
  for (const row of rows) {
    const lifecycle = computeLifecycle(row, today);
    if (sitemapExhibitions.has(row.id) && (lifecycle === "ended" || lifecycle === "cancelled")) {
      sitemapEnded += 1;
    }
    if (lifecycle === "ended") bump("ended", row.id);
    else if (lifecycle === "cancelled") bump("cancelled", row.id);
    else if (lifecycle === "extended" && row.endDate < today) bump("extended_past_end", row.id);
    else if (lifecycle === "extended") bump("extended_still_in_range", row.id);
    else bump(lifecycle, row.id);
  }

  const curations = await loadPublishedDecks(prisma);
  let servable = 0;
  let unservable = 0;
  let unservableInSitemap = 0;
  let unservableInLlmsTxt = 0;
  let unservableInDecksMd = 0;
  let servableMissingSitemap = 0;
  const unservableHits: string[] = [];
  const unservableNames: string[] = [];
  for (const curation of curations) {
    const listable = isDeckListable(curation, today);
    if (listable) {
      servable += 1;
      if (!sitemapDecks.has(curation.id)) servableMissingSitemap += 1;
    } else {
      unservable += 1;
      const inSitemap = sitemapDecks.has(curation.id);
      const inTxt = llmsTxtDecks.has(curation.id);
      const inMd = decksMdIds.has(curation.id);
      if (inSitemap) unservableInSitemap += 1;
      if (inTxt) unservableInLlmsTxt += 1;
      if (inMd) unservableInDecksMd += 1;
      if (inSitemap || inTxt || inMd) unservableHits.push(curation.id);
      unservableNames.push(`${curation.id} ${curation.title}`);
    }
  }

  console.log(`base ${base}`);
  console.log(`today ${today}`);
  console.log(`sitemap_locs ${total}`);
  console.log(`by_type ${JSON.stringify(counts)}`);
  console.log(`sitemap_ended_or_cancelled ${sitemapEnded}`);
  for (const [key, value] of Object.entries(tally)) {
    console.log(
      `case ${key} total ${value.total} sitemap ${value.inSitemap} llms_exhibitions ${value.inLlms}`
    );
  }
  if ((tally.extended_past_end?.total ?? 0) === 0) {
    console.log("extended_past_end 실데이터 사례 없음, 단위 테스트로만 확인");
  }
  console.log(
    `decks servable ${servable} unservable ${unservable} unservable_sitemap ${unservableInSitemap} unservable_llms_txt ${unservableInLlmsTxt} unservable_decks_md ${unservableInDecksMd} servable_missing_sitemap ${servableMissingSitemap}`
  );
  if (unservableHits.length > 0) console.log(`unservable_hits ${unservableHits.join(",")}`);
  for (const name of unservableNames) console.log(`unservable ${name}`);

  const top = [...llmsTxt.matchAll(/\[([^\]]+)\]\(([^)]*\/decks\/[^)]+)\)/g)].slice(0, 12);
  console.log("llms_txt_top");
  for (const match of top) console.log(`- ${match[1]} ${match[2]}`);

  for (const id of watch) {
    console.log(
      `watch ${id} sitemap_exhibition ${sitemapExhibitions.has(id)} sitemap_deck ${sitemapDecks.has(id)} llms_txt ${llmsTxtDecks.has(id)} decks_md ${decksMdIds.has(id)} llms_exhibition ${llmsExhibitions.has(id)}`
    );
  }

  const named = await prisma.exhibition.findMany({
    where: { id: { in: ["blue-bird", ...watch] } },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      lifecycleOverride: true,
      title: true
    }
  });
  for (const row of named) {
    console.log(
      `db_exhibition ${row.id} status ${row.status} end ${row.endDate} override ${row.lifecycleOverride ?? "-"} lifecycle ${computeLifecycle(row, today)} title ${row.title}`
    );
  }
  const blueShows = await prisma.exhibition.findMany({
    where: {
      OR: [
        { id: { contains: "blue-bird" } },
        { title: { contains: "blue-bird", mode: "insensitive" } },
        { title: { contains: "블루버드", mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      lifecycleOverride: true,
      title: true
    },
    take: 10
  });
  for (const row of blueShows) {
    console.log(
      `blue_exhibition ${row.id} status ${row.status} end ${row.endDate} override ${row.lifecycleOverride ?? "-"} lifecycle ${computeLifecycle(row, today)} title ${row.title}`
    );
  }
  const decks = await prisma.curation.findMany({
    where: {
      OR: [
        { id: { in: ["blue-bird", ...watch] } },
        { id: { contains: "blue-bird" } },
        { title: { contains: "blue-bird", mode: "insensitive" } },
        { title: { contains: "블루", mode: "insensitive" } }
      ]
    },
    select: { id: true, published: true, title: true },
    take: 10
  });
  for (const row of decks) {
    const summary = curations.find((item) => item.id === row.id);
    console.log(
      `db_deck ${row.id} published ${row.published} servable ${summary ? isDeckListable(summary, today) : "not-loaded"} title ${row.title}`
    );
  }
  const overrides = await prisma.exhibition.groupBy({
    by: ["status", "lifecycleOverride"],
    _count: { _all: true }
  });
  for (const row of overrides) {
    if (!row.lifecycleOverride) continue;
    console.log(`override ${row.status} ${row.lifecycleOverride} ${row._count._all}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "check failed");
  process.exit(1);
});
