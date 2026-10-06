import { AdminDashboard } from "@/components/AdminDashboard";
import { buildStopSummaryFromTypes } from "@/lib/curation-stop-draft";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { getCurationMetrics } from "@/lib/curation-metrics";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { readShowOnHome } from "@/lib/walkers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "관리자"
};

type AdminPageProps = {
  searchParams: Promise<{ tab?: string; intake?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getSession();
  const params = await searchParams;

  if (!session) {
    const qs = new URLSearchParams();
    if (params.tab) qs.set("tab", params.tab);
    if (params.intake) qs.set("intake", params.intake);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/auth/login?redirect=${encodeURIComponent(`/admin${suffix}`)}`);
  }

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  const initialTab =
    params.tab === "questions" ||
    params.tab === "places" ||
    params.tab === "tips" ||
    params.tab === "applications" ||
    params.tab === "review" ||
    params.tab === "ownership" ||
    params.tab === "members" ||
    params.tab === "events" ||
    params.tab === "curations"
      ? params.tab
      : params.intake
        ? "questions"
        : "curations";
  const initialIntakeId = params.intake?.trim() || null;


  const ownershipExhibitionSelect = {
    id: true,
    title: true,
    district: true,
    status: true,
    source: true,
    homeHero: true,
    registeredBy: { select: { name: true, email: true } }
  } as const;

  const ownershipExhibitionFallbackSelect = {
    id: true,
    title: true,
    district: true,
    status: true,
    source: true,
    registeredBy: { select: { name: true, email: true } }
  } as const;

  async function loadOwnershipExhibitions() {
    try {
      return await prisma.exhibition.findMany({
        where: { source: { not: "PUBLIC_API" } },
        orderBy: { updatedAt: "desc" },
        take: 200,
        select: ownershipExhibitionSelect
      });
    } catch (error) {
      console.error("admin exhibitions homeHero select failed", error);
      const fallback = await prisma.exhibition.findMany({
        where: { source: { not: "PUBLIC_API" } },
        orderBy: { updatedAt: "desc" },
        take: 200,
        select: ownershipExhibitionFallbackSelect
      });
      return fallback.map((item) => ({ ...item, homeHero: false }));
    }
  }

  const [
    applications,
    members,
    curations,
    exhibitions,
    places,
    placeTips,
    spaces,
    eventBundle,
    curationMetrics,
    reviewSpaces,
    reviewPrograms,
    ownershipSpaces,
    ownershipExhibitions,
    questions,
    walkerCandidates,
    ownershipPrograms,
    intakePendingCount
  ] = await Promise.all([
    prisma.artistApplication.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        artistStatus: true,
        emailVerifiedAt: true,
        createdAt: true,
        phone: true,
        _count: {
          select: {
            exhibitions: true,
            ownedSpaces: true,
            hostedPrograms: true,
            reservations: true
          }
        }
      }
    }),
    prisma.curation.findMany({
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
    }),
    prisma.exhibition.findMany({
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
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.place.findMany({
      orderBy: [{ district: "asc" }, { name: "asc" }],
      take: 500
    }),
    prisma.placeTip.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        user: { select: { name: true, nickname: true, email: true } },
        place: { select: { id: true, name: true } }
      }
    }),
    prisma.space.findMany({
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
      orderBy: [{ district: "asc" }, { name: "asc" }],
      take: 500
    }),
    getAdminEventData(),
    getCurationMetrics().catch(() => []),
    prisma.space.findMany({
      where: { OR: [{ status: "DRAFT" }, { isPublic: false }] },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true, email: true } } },
      take: 200
    }),
    prisma.program.findMany({
      where: { OR: [{ status: "DRAFT" }, { isPublic: false }] },
      orderBy: { createdAt: "desc" },
      include: {
        space: { select: { name: true } },
        exhibition: { select: { title: true, venue: true } },
        host: { select: { name: true, email: true } }
      },
      take: 200
    }),
    prisma.space.findMany({
      orderBy: [{ district: "asc" }, { name: "asc" }],
      include: { owner: { select: { name: true, email: true } } },
      take: 500
    }),
    loadOwnershipExhibitions(),
    prisma.artistQuestion
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 120,
        include: {
          artist: { select: { name: true, nickname: true } },
          exhibition: { select: { title: true } }
        }
      })
      .catch((error) => {
        console.error("admin questions load failed", error);
        return [] as Prisma.ArtistQuestionGetPayload<{
          include: {
            artist: { select: { name: true; nickname: true } };
            exhibition: { select: { title: true } };
          };
        }>[];
      }),
    prisma.user.findMany({
      where: { artistStatus: "APPROVED" },
      orderBy: { name: "asc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        artistApplication: true
      }
    }),
    prisma.program.findMany({
      orderBy: [{ startDate: "desc" }],
      take: 200,
      include: {
        space: { select: { name: true } },
        exhibition: { select: { title: true, venue: true } },
        host: { select: { name: true, email: true } }
      }
    }),
    prisma.question.count({
      where: { status: { in: ["submitted", "sent"] } }
    }).catch((error) => {
      console.error("admin intake pending count failed", error);
      return 0;
    })
  ]);

  const { eventSummaries, recentEvents, channelCounts } = eventBundle;

  return (
    <>
      <Header activeTab="MY" />
      <AdminDashboard
        initialTab={initialTab}
        initialIntakeId={initialIntakeId}
        intakePendingCount={intakePendingCount}
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
          editorialNote: place.editorialNote,
          imageUrl: place.imageUrl,
          homeFeatured: place.homeFeatured,
          homeSortOrder: place.homeSortOrder,
          rarity: place.rarity ?? null,
          isActive: place.isActive,
          usedCount: place.usedCount
        }))}
        placeTips={placeTips.map((tip) => ({
          id: tip.id,
          name: tip.name,
          sourceUrl: tip.sourceUrl,
          situation: tip.situation,
          district: tip.district,
          imageUrl: tip.imageUrl,
          status: tip.status,
          adminNote: tip.adminNote,
          createdAt: tip.createdAt.toISOString(),
          userName: tip.user.nickname || tip.user.name,
          userEmail: tip.user.email,
          placeId: tip.placeId,
          placeName: tip.place?.name ?? null
        }))}
        eventSummaries={eventSummaries
          .map((summary) => ({
            type: summary.type,
            count: summary._count._all
          }))
          .sort((a, b) => b.count - a.count)}
        channelCounts={channelCounts}
        recentEvents={recentEvents.map((event) => {
          let channel: string | null = null;
          try {
            const meta = JSON.parse(event.metadata || "{}") as { channel?: string };
            channel = typeof meta.channel === "string" ? meta.channel : null;
          } catch {
            channel = null;
          }
          return {
            id: event.id,
            type: event.type,
            createdAt: event.createdAt.toISOString(),
            source: event.source,
            channel,
            metadata: event.metadata,
            userLabel: event.user
              ? `${event.user.name} (${event.user.email})`
              : "비회원",
            exhibitionTitle: event.exhibition?.title ?? "-"
          };
        })}
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
          spaceName:
            program.space?.name ??
            program.exhibition?.venue ??
            program.exhibition?.title ??
            "장소 미정",
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
          homeHero: exhibition.homeHero,
          registeredByName: exhibition.registeredBy?.name ?? null,
          registeredByEmail: exhibition.registeredBy?.email ?? null
        }))}
        ownershipPrograms={ownershipPrograms.map((program) => ({
          id: program.id,
          slug: program.slug,
          title: program.title,
          status: program.status,
          spaceName:
            program.space?.name ??
            program.exhibition?.venue ??
            program.exhibition?.title ??
            "장소 미정",
          hostName: program.host?.name ?? null,
          hostEmail: program.host?.email ?? null
        }))}
        members={members.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          artistStatus: user.artistStatus,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          phone: user.phone,
          exhibitionCount: user._count.exhibitions,
          spaceCount: user._count.ownedSpaces,
          programCount: user._count.hostedPrograms,
          reservationCount: user._count.reservations
        }))}
        questions={questions.map((question) => ({
          id: question.id,
          kind: question.kind,
          topic: question.topic,
          status: question.status,
          fromName: question.fromName,
          fromEmail: question.fromEmail,
          body: question.body,
          answer: question.answer,
          adminNote: question.adminNote,
          unlistedArtistName: question.unlistedArtistName,
          createdAt: question.createdAt.toISOString(),
          artistName: question.artist
            ? question.artist.nickname || question.artist.name
            : null,
          exhibitionTitle: question.exhibition?.title ?? null
        }))}
        walkers={walkerCandidates.map((user) => ({
          userId: user.id,
          name: user.name,
          email: user.email,
          showOnHome: readShowOnHome(user.artistApplication)
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
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [eventSummaries, recentEvents, channelRows] = await Promise.all([
      prisma.eventLog.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.eventLog.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        where: {
          OR: [{ userId: null }, { user: { role: { not: "ADMIN" } } }]
        },
        include: {
          user: { select: { name: true, email: true, role: true } },
          exhibition: { select: { title: true } }
        }
      }),
      prisma.eventLog.findMany({
        where: {
          type: "EXHIBITION_VIEW",
          createdAt: { gte: since },
          OR: [{ userId: null }, { user: { role: { not: "ADMIN" } } }]
        },
        select: { metadata: true },
        take: 800
      })
    ]);

    const channelCounts: Record<string, number> = {};
    for (const row of channelRows) {
      let channel = "unknown";
      try {
        const meta = JSON.parse(row.metadata || "{}") as { channel?: string };
        if (typeof meta.channel === "string" && meta.channel) channel = meta.channel;
      } catch {
        // ignore
      }
      channelCounts[channel] = (channelCounts[channel] ?? 0) + 1;
    }

    return {
      eventSummaries,
      recentEvents,
      channelCounts: Object.entries(channelCounts)
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)
    };
  } catch (error) {
    console.error("Failed to load admin event logs", error);
    return { eventSummaries: [], recentEvents: [], channelCounts: [] };
  }
}
