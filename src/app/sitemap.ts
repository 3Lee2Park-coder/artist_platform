import { getSiteUrl } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { getTodayKST } from "@/lib/date";
import type { MetadataRoute } from "next";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const today = getTodayKST();

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
    lastModified: new Date(),
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

  const [exhibitions, spaces, programs, curations, artists, places] =
    await Promise.all([
      prisma.exhibition.findMany({
        where: {
          status: "PUBLISHED",
          endDate: { gte: today }
        },
        select: { id: true, updatedAt: true },
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
      prisma.curation.findMany({
        where: { published: true },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 500
      }),
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
    // 덱은 3~4일 간격으로 다시 묶으므로 daily로 알린다
    ...curations.map((item) => ({
      url: `${siteUrl}/decks/${item.id}`,
      lastModified: item.updatedAt,
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
