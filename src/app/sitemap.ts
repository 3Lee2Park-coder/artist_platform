import { getTodayKST } from "@/lib/date";
import { getPublishedCurations } from "@/lib/exhibitions";
import { prisma } from "@/lib/prisma";
import { isDeckListable, isExhibitionListable } from "@/lib/sitemap-eligibility";
import { getSiteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

function latest(dates: Date[]) {
  if (dates.length === 0) return undefined;
  return dates.reduce((max, date) => (date > max ? date : max));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const today = getTodayKST();

  const [exhibitionRows, spaces, programs, curations, artists, places] =
    await Promise.all([
      prisma.exhibition.findMany({
        where: {
          status: "PUBLISHED",
          OR: [{ endDate: { gte: today } }, { lifecycleOverride: "EXTENDED" }]
        },
        select: {
          id: true,
          updatedAt: true,
          startDate: true,
          endDate: true,
          lifecycleOverride: true
        },
        orderBy: { updatedAt: "desc" },
        take: 5000
      }),
      prisma.space.findMany({
        where: { status: "PUBLISHED", isPublic: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000
      }),
      prisma.program.findMany({
        where: {
          status: "PUBLISHED",
          isPublic: true,
          endDate: { gte: today }
        },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000
      }),
      getPublishedCurations(),
      prisma.user.findMany({
        where: { artistStatus: "APPROVED" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000
      }),
      prisma.place.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000
      })
    ]);

  const exhibitions = exhibitionRows.filter((item) =>
    isExhibitionListable(item, today)
  );
  const decks = curations
    .filter((curation) => isDeckListable(curation, today))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 500);
  const exhibitionUpdated = latest(exhibitions.map((item) => item.updatedAt));
  const deckUpdated = latest(decks.map((item) => new Date(item.updatedAt)));
  const homeUpdated = latest(
    [exhibitionUpdated, deckUpdated].filter((date): date is Date => Boolean(date))
  );
  const staticLastModified: Record<string, Date | undefined> = {
    "": homeUpdated,
    "/exhibitions": exhibitionUpdated,
    "/decks": deckUpdated
  };

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/exhibitions",
    "/decks",
    "/spaces",
    "/programs",
    "/map",
    "/about",
    "/for-artists",
    "/llms.txt",
    "/llms/decks.md",
    "/llms/places.md",
    "/llms/exhibitions.md"
  ].map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    ...(staticLastModified[path] ? { lastModified: staticLastModified[path] } : {}),
    changeFrequency: path === "" || path === "/exhibitions" ? "daily" : "weekly",
    priority:
      path === ""
        ? 1
        : path === "/exhibitions" || path === "/map"
          ? 0.9
          : path === "/decks"
            ? 0.85
            : path === "/about" || path.startsWith("/llms")
              ? 0.6
              : 0.7
  }));

  return [
    ...staticRoutes,
    ...exhibitions.map((item) => ({
      url: `${siteUrl}/exhibitions/${item.id}`,
      lastModified: item.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8
    })),
    ...spaces.map((item) => ({
      url: `${siteUrl}/spaces/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...programs.map((item) => ({
      url: `${siteUrl}/programs/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6
    })),
    ...decks.map((item) => ({
      url: `${siteUrl}/decks/${item.id}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.85
    })),
    ...artists.map((item) => ({
      url: `${siteUrl}/artists/${item.id}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5
    })),
    ...places.map((item) => ({
      url: `${siteUrl}/places/${item.id}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.65
    }))
  ];
}
