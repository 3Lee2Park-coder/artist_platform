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
import {
  annotateViewerState,
  getActiveExhibitions,
  getAllArtworks,
  getListedExhibitions,
  getPeriodExhibitionGroups,
  getPublishedCurations
} from "@/lib/exhibitions";
import { getActivePrograms, getProgramRemainingSeats } from "@/lib/programs";
import { getPublicSpaces } from "@/lib/spaces";
import { getTalkRemainingByExhibitionIds } from "@/lib/talk-availability";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const userId = session?.id;

  const activeExhibitionsRaw = await getActiveExhibitions();
  const listedExhibitionsRaw = await getListedExhibitions();
  const activeExhibitions = await annotateViewerState(activeExhibitionsRaw, userId);
  const listedExhibitions = await annotateViewerState(listedExhibitionsRaw, userId);

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
  const talkRemainingById = await getTalkRemainingByExhibitionIds(
    talkExhibitions.map((exhibition) => exhibition.id)
  );

  const spaces = await getPublicSpaces();
  const programs = await getActivePrograms();
  const programRemainingById = await getProgramRemainingSeats(
    programs.map((program) => program.id)
  );

  const artworks = await getAllArtworks();
  const curationsRaw = await getPublishedCurations();
  const curations = await Promise.all(
    curationsRaw.map(async (curation) => ({
      ...curation,
      exhibitions: await annotateViewerState(curation.exhibitions, userId)
    }))
  );
  const periodGroupsRaw = await getPeriodExhibitionGroups();
  const periodGroups = await Promise.all(
    periodGroupsRaw.map(async (group) => ({
      ...group,
      exhibitions: await annotateViewerState(group.exhibitions, userId)
    }))
  );

  const hasClusterContent = spaces.length > 0;
  const situationalCurations = [...curations].sort(
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

        <AllExhibitionsSection exhibitions={listedExhibitions.slice(0, 36)} />

        <SupplierCtaSection />
      </main>

      <Footer />
    </>
  );
}
