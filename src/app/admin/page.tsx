import { AdminDashboard } from "@/components/AdminDashboard";
import { buildStopSummaryFromTypes } from "@/lib/curation-stop-draft";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { getCurationMetrics } from "@/lib/curation-metrics";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "관리자 | Exhibit"
};

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/admin");
  }

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  const applications = await prisma.artistApplication.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });

  const curations = await prisma.curation.findMany({
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    include: {
      basePlace: { select: { id: true, name: true } },
      stops: {
        orderBy: { sortOrder: "asc" },
        include: {
          space: {
            select: {
              id: true,
              name: true,
              district: true,
              lat: true,
              lng: true
            }
          },
          exhibition: {
            select: {
              id: true,
              title: true,
              district: true,
              lat: true,
              lng: true
            }
          },
          place: {
            select: {
              id: true,
              name: true,
              district: true,
              lat: true,
              lng: true
            }
          }
        }
      },
      exhibitions: {
        orderBy: { sortOrder: "asc" },
        include: { exhibition: { select: { id: true, title: true } } }
      }
    }
  });

  const exhibitions = await prisma.exhibition.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      source: true,
      region: true,
      district: true,
      lat: true,
      lng: true
    },
    orderBy: { createdAt: "desc" }
  });

  const places = await prisma.place.findMany({
    orderBy: [{ district: "asc" }, { name: "asc" }]
  });

  const spaces = await prisma.space.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    select: {
      id: true,
      name: true,
      type: true,
      district: true,
      address: true,
      lat: true,
      lng: true,
      visitPolicy: true
    },
    orderBy: [{ district: "asc" }, { name: "asc" }]
  });

  const { eventSummaries, recentEvents } = await getAdminEventData();
  const curationMetrics = await getCurationMetrics().catch(() => []);

  const reviewSpaces = await prisma.space.findMany({
    where: { OR: [{ status: "DRAFT" }, { isPublic: false }] },
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, email: true } } }
  });

  const reviewPrograms = await prisma.program.findMany({
    where: { OR: [{ status: "DRAFT" }, { isPublic: false }] },
    orderBy: { createdAt: "desc" },
    include: {
      space: { select: { name: true } },
      host: { select: { name: true, email: true } }
    }
  });

  const ownershipSpaces = await prisma.space.findMany({
    orderBy: [{ district: "asc" }, { name: "asc" }],
    include: { owner: { select: { name: true, email: true } } }
  });

  const ownershipExhibitions = await prisma.exhibition.findMany({
    where: { source: { not: "PUBLIC_API" } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      district: true,
      status: true,
      source: true,
      registeredBy: { select: { name: true, email: true } }
    }
  });

  const ownershipPrograms = await prisma.program.findMany({
    orderBy: [{ startDate: "desc" }],
    take: 200,
    include: {
      space: { select: { name: true } },
      host: { select: { name: true, email: true } }
    }
  });

  return (
    <>
      <Header activeTab="MY" />
      <AdminDashboard
        applications={applications.map((application) => ({
          userId: application.userId,
          name: application.user.name,
          email: application.user.email,
          bio: application.bio,
          portfolioUrl: application.portfolioUrl,
          activityArea: application.activityArea
        }))}
        curations={curations.map((curation) => ({
          id: curation.id,
          title: curation.title,
          subtitle: curation.subtitle,
          description: curation.description,
          storyJson: curation.storyJson,
          coverImageUrl: curation.coverImageUrl,
          published: curation.published,
          featured: curation.featured,
          coverTone: curation.coverTone,
          neighborhood: curation.neighborhood,
          situationTags: safeJsonArray(curation.situationTags),
          basePlaceId: curation.basePlaceId,
          basePlaceName: curation.basePlace?.name ?? null,
          radiusMeters: curation.radiusMeters,
          durationText: curation.durationText,
          stopSummary:
            curation.stops.length > 0
              ? buildStopSummaryFromTypes(
                  curation.stops.map((stop) => ({
                    stopType: stop.stopType as "SPACE" | "EXHIBITION" | "PLACE"
                  }))
                )
              : curation.exhibitions.length > 0
                ? `전시 ${curation.exhibitions.length} (레거시)`
                : "동선 없음",
          exhibitionIds: curation.exhibitions.map((item) => item.exhibitionId),
          exhibitionTitles: curation.exhibitions.map(
            (item) => item.exhibition.title
          ),
          stops: curation.stops
            .map((stop) => {
              if (stop.stopType === "SPACE" && stop.space) {
                return {
                  key: `SPACE:${stop.space.id}:${stop.id}`,
                  stopType: "SPACE" as const,
                  refId: stop.space.id,
                  title: stop.space.name,
                  district: stop.space.district,
                  lat: stop.space.lat,
                  lng: stop.space.lng,
                  editorialBadge: stop.editorialBadge ?? "",
                  distanceText: stop.distanceText ?? "",
                  note: stop.note ?? ""
                };
              }
              if (stop.stopType === "EXHIBITION" && stop.exhibition) {
                return {
                  key: `EXHIBITION:${stop.exhibition.id}:${stop.id}`,
                  stopType: "EXHIBITION" as const,
                  refId: stop.exhibition.id,
                  title: stop.exhibition.title,
                  district: stop.exhibition.district,
                  lat: stop.exhibition.lat,
                  lng: stop.exhibition.lng,
                  editorialBadge: stop.editorialBadge ?? "",
                  distanceText: stop.distanceText ?? "",
                  note: stop.note ?? ""
                };
              }
              if (stop.stopType === "PLACE" && stop.place) {
                return {
                  key: `PLACE:${stop.place.id}:${stop.id}`,
                  stopType: "PLACE" as const,
                  refId: stop.place.id,
                  title: stop.place.name,
                  district: stop.place.district,
                  lat: stop.place.lat,
                  lng: stop.place.lng,
                  editorialBadge: stop.editorialBadge ?? "",
                  distanceText: stop.distanceText ?? "",
                  note: stop.note ?? ""
                };
              }
              return null;
            })
            .filter((stop): stop is NonNullable<typeof stop> => Boolean(stop))
        }))}
        spaceOptions={spaces.map((space) => ({
          id: space.id,
          name: space.name,
          type: space.type,
          district: space.district,
          address: space.address,
          lat: space.lat,
          lng: space.lng,
          visitPolicy: space.visitPolicy
        }))}
        exhibitionOptions={exhibitions.map((exhibition) => ({
          id: exhibition.id,
          title: exhibition.title,
          source: exhibition.source,
          region: exhibition.region,
          district: exhibition.district,
          lat: exhibition.lat,
          lng: exhibition.lng
        }))}
        places={places.map((place) => ({
          id: place.id,
          name: place.name,
          type: place.type,
          region: place.region,
          district: place.district,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          tags: safeJsonArray(place.tags),
          sourceUrl: place.sourceUrl,
          notes: place.notes,
          isActive: place.isActive,
          usedCount: place.usedCount
        }))}
        eventSummaries={eventSummaries
          .map((summary) => ({
            type: summary.type,
            count: summary._count._all
          }))
          .sort((a, b) => b.count - a.count)}
        recentEvents={recentEvents.map((event) => ({
          id: event.id,
          type: event.type,
          createdAt: event.createdAt.toISOString(),
          source: event.source,
          metadata: event.metadata,
          userLabel: event.user
            ? `${event.user.name} (${event.user.email})`
            : "비회원",
          exhibitionTitle: event.exhibition?.title ?? "-"
        }))}
        curationMetrics={curationMetrics}
        reviewSpaces={reviewSpaces.map((space) => ({
          id: space.id,
          slug: space.slug,
          name: space.name,
          district: space.district,
          status: space.status,
          isPublic: space.isPublic,
          createdAt: space.createdAt.toISOString(),
          ownerName: space.owner?.name ?? null,
          ownerEmail: space.owner?.email ?? null
        }))}
        reviewPrograms={reviewPrograms.map((program) => ({
          id: program.id,
          slug: program.slug,
          title: program.title,
          status: program.status,
          isPublic: program.isPublic,
          startDate: program.startDate,
          endDate: program.endDate,
          spaceName: program.space.name,
          hostName: program.host?.name ?? null,
          hostEmail: program.host?.email ?? null
        }))}
        ownershipSpaces={ownershipSpaces.map((space) => ({
          id: space.id,
          slug: space.slug,
          name: space.name,
          district: space.district,
          status: space.status,
          ownerName: space.owner?.name ?? null,
          ownerEmail: space.owner?.email ?? null
        }))}
        ownershipExhibitions={ownershipExhibitions.map((exhibition) => ({
          id: exhibition.id,
          title: exhibition.title,
          district: exhibition.district,
          status: exhibition.status,
          source: exhibition.source,
          registeredByName: exhibition.registeredBy?.name ?? null,
          registeredByEmail: exhibition.registeredBy?.email ?? null
        }))}
        ownershipPrograms={ownershipPrograms.map((program) => ({
          id: program.id,
          slug: program.slug,
          title: program.title,
          status: program.status,
          spaceName: program.space.name,
          hostName: program.host?.name ?? null,
          hostEmail: program.host?.email ?? null
        }))}
      />
      <Footer />
    </>
  );
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function getAdminEventData() {
  try {
    const eventSummaries = await prisma.eventLog.groupBy({
      by: ["type"],
      _count: { _all: true }
    });
    const recentEvents = await prisma.eventLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        exhibition: { select: { title: true } }
      }
    });

    return { eventSummaries, recentEvents };
  } catch (error) {
    console.error("Failed to load admin event logs", error);
    return { eventSummaries: [], recentEvents: [] };
  }
}
