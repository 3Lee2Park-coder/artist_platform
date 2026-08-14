import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MyPageDashboard } from "@/components/MyPageDashboard";
import {
  displayName,
  getSession,
  getUserById,
  isApprovedArtist
} from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";
import { parseTasteArray } from "@/lib/taste";
import { getVisitArchive } from "@/lib/visit-archive";
import { redirect } from "next/navigation";

export const metadata = {
  title: "마이페이지"
};

function parseCategories(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function topEntry(counts: Map<string, number>): { label: string; count: number } | null {
  let best: { label: string; count: number } | null = null;
  for (const [label, count] of counts) {
    if (!best || count > best.count) {
      best = { label, count };
    }
  }
  return best;
}

export default async function MyPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/my");
  }

  const today = getTodayKST();
  const isArtist = isApprovedArtist(session);
  const user = await getUserById(session.id);

  const exhibitionSelect = {
    id: true,
    title: true,
    venue: true,
    district: true,
    region: true,
    heroImageUrl: true,
    heroTone: true,
    curationAvailable: true,
    categories: true,
    endDate: true
  } as const;

  const memberReservations = await prisma.reservation.findMany({
    where: {
      userId: session.id,
      status: { in: ["CONFIRMED"] },
      visitDate: { gte: today }
    },
    include: {
      exhibition: { select: exhibitionSelect },
      program: {
        select: {
          id: true,
          slug: true,
          title: true,
          heroImageUrl: true,
          heroTone: true,
          space: { select: { name: true, district: true } },
          exhibition: {
            select: { venue: true, district: true, region: true, title: true }
          }
        }
      }
    },
    orderBy: [{ visitDate: "asc" }, { slot: "asc" }]
  });

  const allMemberReservations = await prisma.reservation.findMany({
    where: {
      userId: session.id,
      status: { in: ["CONFIRMED", "ATTENDED"] },
      exhibitionId: { not: null }
    },
    select: {
      exhibitionId: true,
      exhibition: { select: { curationAvailable: true } }
    }
  });

  const artistTalkExhibitionIds = new Set(
    allMemberReservations
      .filter((reservation) => reservation.exhibition?.curationAvailable)
      .map((reservation) => reservation.exhibitionId)
  );

  // 다녀온 전시 (예약과 독립된 방문 인증) — 공간/프로그램 방문은 아카이브에서 별도 표시
  const visits = (
    await prisma.visit.findMany({
      where: { userId: session.id, exhibitionId: { not: null } },
      include: {
        exhibition: {
          select: exhibitionSelect
        }
      },
      orderBy: { visitedAt: "desc" }
    })
  ).filter(
    (visit): visit is (typeof visit) & {
      exhibitionId: string;
      exhibition: NonNullable<(typeof visit)["exhibition"]>;
    } => Boolean(visit.exhibitionId && visit.exhibition)
  );

  // 전시·공간·프로그램을 아우르는 방문 아카이브
  const visitArchive = await getVisitArchive(session.id);

  // 저장(찜)한 전시
  const saves = await prisma.saveExhibition.findMany({
    where: { userId: session.id },
    include: {
      exhibition: {
        select: exhibitionSelect
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // 내 리뷰
  const reviews = await prisma.review.findMany({
    where: { userId: session.id },
    include: { exhibition: { select: { id: true, title: true, venue: true } } },
    orderBy: { createdAt: "desc" }
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  let thisYear = 0;
  let thisMonth = 0;
  const genreCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();

  for (const visit of visits) {
    const visitedAt = new Date(visit.visitedAt);
    if (visitedAt.getFullYear() === currentYear) thisYear += 1;
    if (visitedAt.getFullYear() === currentYear && visitedAt.getMonth() === currentMonth) {
      thisMonth += 1;
    }

    for (const category of parseCategories(visit.exhibition.categories)) {
      genreCounts.set(category, (genreCounts.get(category) ?? 0) + 1);
    }
    regionCounts.set(
      visit.exhibition.region,
      (regionCounts.get(visit.exhibition.region) ?? 0) + 1
    );
  }

  const stats = {
    totalVisited: visits.length,
    thisYear,
    thisMonth,
    topGenre: topEntry(genreCounts),
    topRegion: topEntry(regionCounts)
  };

  const reviewByExhibitionId = new Map(
    reviews.map((review) => [
      review.exhibitionId,
      {
        recommend: review.recommend,
        memo: review.memo,
        moodTags: parseTasteArray(review.moodTags)
      }
    ])
  );

  const toLibraryExhibition = (exhibition: {
    id: string;
    title: string;
    venue: string;
    district: string;
    region: string;
    heroImageUrl: string | null;
    heroTone: string;
    curationAvailable: boolean;
  }) => ({
    id: exhibition.id,
    title: exhibition.title,
    venue: exhibition.venue,
    district: exhibition.district,
    region: exhibition.region,
    heroImageUrl: resolveMediaUrl(exhibition.heroImageUrl),
    heroTone: exhibition.heroTone,
    curationAvailable: exhibition.curationAvailable
  });

  const savedExhibitions = saves.map((save) => ({
    ...toLibraryExhibition(save.exhibition),
    ended: save.exhibition.endDate < today
  }));

  const visitedExhibitions = visits.map((visit) => {
    const review = reviewByExhibitionId.get(visit.exhibitionId);

    return {
      ...toLibraryExhibition(visit.exhibition),
      visitId: visit.id,
      visitedAt: visit.visitedAt.toISOString().slice(0, 10),
      recommend: review?.recommend ?? null,
      moodTags: review?.moodTags ?? [],
      memo: review?.memo ?? null,
      hadArtistTalk: artistTalkExhibitionIds.has(visit.exhibitionId)
    };
  });

  const libraryReservations = memberReservations
    .map((reservation) => {
      if (reservation.exhibitionId && reservation.exhibition) {
        return {
          id: reservation.id,
          visitDate: reservation.visitDate,
          slot: reservation.slot,
          status: reservation.status,
          kind: "exhibition" as const,
          detailHref: `/exhibitions/${reservation.exhibition.id}`,
          exhibition: toLibraryExhibition(reservation.exhibition)
        };
      }
      if (reservation.programId && reservation.program) {
        const program = reservation.program;
        return {
          id: reservation.id,
          visitDate: reservation.visitDate,
          slot: reservation.slot,
          status: reservation.status,
          kind: "program" as const,
          detailHref: `/programs/${program.slug}`,
          exhibition: {
            id: program.id,
            title: program.title,
            venue:
              program.space?.name ??
              program.exhibition?.venue ??
              program.exhibition?.title ??
              "장소 미정",
            district:
              program.space?.district ?? program.exhibition?.district ?? "",
            region: program.exhibition?.region ?? "",
            heroImageUrl: resolveMediaUrl(program.heroImageUrl),
            heroTone: program.heroTone,
            curationAvailable: false
          }
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const recommendCount = reviews.filter((review) => review.recommend).length;

  const artistExhibitions = isArtist
    ? await prisma.exhibition.findMany({
        where: { registeredById: session.id },
        include: { _count: { select: { reservations: true } } },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const artistSpaces = isArtist
    ? await prisma.space.findMany({
        where: { ownerUserId: session.id },
        include: { _count: { select: { programs: true, exhibitions: true } } },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const artistPrograms = isArtist
    ? await prisma.program.findMany({
        where: {
          OR: [
            { hostUserId: session.id },
            { space: { ownerUserId: session.id } },
            { exhibition: { registeredById: session.id } }
          ]
        },
        include: {
          space: { select: { id: true, name: true, slug: true } },
          exhibition: { select: { id: true, title: true, venue: true } }
        },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const artistReservationsRaw = isArtist
    ? await prisma.reservation.findMany({
        where: {
          OR: [
            { exhibition: { registeredById: session.id } },
            {
              program: {
                OR: [
                  { hostUserId: session.id },
                  { space: { ownerUserId: session.id } },
                  { exhibition: { registeredById: session.id } }
                ]
              }
            }
          ]
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          exhibition: {
            select: { id: true, title: true, venue: true, district: true }
          },
          program: {
            select: {
              id: true,
              title: true,
              space: { select: { name: true, district: true } },
              exhibition: { select: { venue: true, district: true, title: true } }
            }
          }
        },
        orderBy: [{ visitDate: "asc" }, { slot: "asc" }]
      })
    : [];

  const artistReservations = artistReservationsRaw
    .map((reservation) => {
      if (reservation.exhibitionId && reservation.exhibition) {
        return {
          id: reservation.id,
          visitDate: reservation.visitDate,
          slot: reservation.slot,
          status: reservation.status,
          exhibition: reservation.exhibition,
          user: reservation.user
        };
      }
      if (reservation.programId && reservation.program) {
        return {
          id: reservation.id,
          visitDate: reservation.visitDate,
          slot: reservation.slot,
          status: reservation.status,
          exhibition: {
            id: reservation.program.id,
            title: reservation.program.title,
            venue:
              reservation.program.space?.name ??
              reservation.program.exhibition?.venue ??
              reservation.program.exhibition?.title ??
              "장소 미정",
            district:
              reservation.program.space?.district ??
              reservation.program.exhibition?.district ??
              ""
          },
          user: reservation.user
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const slotSummaryMap = new Map<
    string,
    {
      exhibitionId: string;
      exhibitionTitle: string;
      visitDate: string;
      slot: string;
      count: number;
      reservations: typeof artistReservations;
    }
  >();

  for (const reservation of artistReservations) {
    const key = `${reservation.exhibition.id}:${reservation.visitDate}:${reservation.slot}`;
    const existing = slotSummaryMap.get(key);

    if (existing) {
      existing.count += 1;
      existing.reservations.push(reservation);
    } else {
      slotSummaryMap.set(key, {
        exhibitionId: reservation.exhibition.id,
        exhibitionTitle: reservation.exhibition.title,
        visitDate: reservation.visitDate,
        slot: reservation.slot,
        count: 1,
        reservations: [reservation]
      });
    }
  }

  return (
    <>
      <Header activeTab="MY" />
      <MyPageDashboard
        userName={displayName({
          nickname: user?.nickname ?? session.nickname,
          name: session.name
        })}
        nickname={user?.nickname ?? session.nickname}
        legalName={session.name}
        email={session.email}
        role={session.role}
        artistStatus={session.artistStatus}
        isArtist={isArtist}
        isAdmin={session.role === "ADMIN"}
        today={today}
        interestTags={parseTasteArray(user?.interestTags)}
        visitPurposes={parseTasteArray(user?.visitPurposes)}
        stats={stats}
        recommendCount={recommendCount}
        savedExhibitions={savedExhibitions}
        visitedExhibitions={visitedExhibitions}
        libraryReservations={libraryReservations}
        artistExhibitions={artistExhibitions}
        artistSpaces={artistSpaces}
        artistPrograms={artistPrograms}
        artistSlotSummary={Array.from(slotSummaryMap.values())}
        artistReservations={artistReservations}
        visitArchive={visitArchive}
      />
      <Footer />
    </>
  );
}
