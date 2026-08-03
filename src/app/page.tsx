import {
  AllExhibitionsSection,
  ArtworkDiscoverySection,
  SupplierCtaSection
} from "@/components/HomeWireSections";
import { FeaturedCurationHero } from "@/components/FeaturedCurationHero";
import { HomeClusterHero } from "@/components/HomeClusterHero";
import { MeetArtistSection } from "@/components/MeetArtistSection";
import { PeriodExhibitionSection } from "@/components/PeriodExhibitionSection";
import { SituationalCurationSection } from "@/components/SituationalCurationSection";
import { SpaceDiscoverySection } from "@/components/SpaceDiscoverySection";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import {
  annotateViewerState,
  filterActiveExhibitions,
  getFeaturedArtworks,
  getListedExhibitions,
  getPeriodExhibitionGroups,
  getPublishedCurations,
  type CurationSummary
} from "@/lib/exhibitions";
import { getActivePrograms, getProgramRemainingSeats } from "@/lib/programs";
import { getPublicSpaces } from "@/lib/spaces";
import { getTalkRemainingByExhibitionIds } from "@/lib/talk-availability";
import type { Exhibition } from "@/types/exhibition";

/** 세션이 있어도 전시 목록은 60초 캐시를 재사용 (unstable_cache) */
export const revalidate = 60;

function mergeAnnotatedExhibitions<T extends Exhibition>(
  exhibitions: T[],
  annotatedById: Map<string, Exhibition>
): T[] {
  return exhibitions.map((exhibition) => {
    const annotated = annotatedById.get(exhibition.id);
    if (!annotated) return exhibition;
    // saved/visited만 덮어쓰고, CurationExhibitionItem 등의 확장 필드는 유지
    return {
      ...exhibition,
      saved: annotated.saved,
      visited: annotated.visited
    };
  });
}

export default async function HomePage() {
  const session = await getSession();
  const userId = session?.id;
  const today = getTodayKST();

  const [listedRaw, spaces, programs, artworks, curationsRaw] = await Promise.all([
    getListedExhibitions(today),
    getPublicSpaces(),
    getActivePrograms(),
    getFeaturedArtworks(12),
    getPublishedCurations()
  ]);

  const activeRaw = filterActiveExhibitions(listedRaw, today);
  const homeListedRaw = listedRaw.slice(0, 36);

  const annotatePool = new Map<string, Exhibition>();
  for (const exhibition of [...homeListedRaw, ...activeRaw]) {
    annotatePool.set(exhibition.id, exhibition);
  }
  for (const curation of curationsRaw) {
    for (const exhibition of curation.exhibitions) {
      annotatePool.set(exhibition.id, exhibition);
    }
  }

  const periodGroupsRaw = await getPeriodExhibitionGroups(today, listedRaw);
  for (const group of periodGroupsRaw) {
    for (const exhibition of group.exhibitions) {
      annotatePool.set(exhibition.id, exhibition);
    }
  }

  const annotatedPool = await annotateViewerState(
    Array.from(annotatePool.values()),
    userId
  );
  const annotatedById = new Map(
    annotatedPool.map((exhibition) => [exhibition.id, exhibition])
  );

  const listedExhibitions = mergeAnnotatedExhibitions(homeListedRaw, annotatedById);
  const activeExhibitions = mergeAnnotatedExhibitions(activeRaw, annotatedById);
  const mapExhibitions = activeExhibitions.filter(
    (exhibition) => exhibition.source !== "PUBLIC_API"
  );

  const talkExhibitions = activeExhibitions
    .filter(
      (exhibition) =>
        exhibition.reservable &&
        exhibition.reservationSchedule.some((day) => day.slots.length > 0)
    )
    .slice(0, 8);

  const [talkRemainingById, programRemainingById] = await Promise.all([
    getTalkRemainingByExhibitionIds(talkExhibitions.map((exhibition) => exhibition.id)),
    getProgramRemainingSeats(programs.map((program) => program.id))
  ]);

  const curations: CurationSummary[] = curationsRaw.map((curation) => ({
    ...curation,
    exhibitions: mergeAnnotatedExhibitions(curation.exhibitions, annotatedById)
  }));

  const periodGroups = periodGroupsRaw.map((group) => ({
    ...group,
    exhibitions: mergeAnnotatedExhibitions(group.exhibitions, annotatedById)
  }));

  const hasClusterContent = spaces.length > 0;
  const situationalCurations: CurationSummary[] = [...curations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      <Header />

      <main className="page-shell home-wire">
        {hasClusterContent ? (
          <HomeClusterHero spaces={spaces} curations={curations} />
        ) : curations.length > 0 ? (
          <FeaturedCurationHero curations={curations} />
        ) : null}

        <SpaceDiscoverySection spaces={spaces} />

        <SituationalCurationSection
          curations={situationalCurations}
          mapExhibitions={mapExhibitions}
        />

        <MeetArtistSection
          programs={programs}
          programRemainingById={programRemainingById}
          talkExhibitions={talkExhibitions}
          talkRemainingById={talkRemainingById}
        />

        <PeriodExhibitionSection groups={periodGroups} />

        <ArtworkDiscoverySection artworks={artworks} />

        <AllExhibitionsSection exhibitions={listedExhibitions} />

        <SupplierCtaSection />
      </main>

      <Footer />
    </>
  );
}
