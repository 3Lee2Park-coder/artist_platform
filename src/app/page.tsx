import {
  AllExhibitionsSection,
  ArtworkDiscoverySection,
  SupplierCtaSection
} from "@/components/HomeWireSections";
import { FeaturedCurationHero } from "@/components/FeaturedCurationHero";
import { HiddenPlacesSection } from "@/components/HiddenPlacesSection";
import { HomeClusterHero } from "@/components/HomeClusterHero";
import { MeetArtistSection } from "@/components/MeetArtistSection";
import { PeriodExhibitionSection } from "@/components/PeriodExhibitionSection";
import { SituationalCurationSection } from "@/components/SituationalCurationSection";
import { SpaceDiscoverySection } from "@/components/SpaceDiscoverySection";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getTodayKST } from "@/lib/date";
import {
  filterActiveExhibitions,
  getFeaturedArtworks,
  getListedExhibitions,
  getPeriodExhibitionGroups,
  getPublishedCurations,
  type CurationSummary
} from "@/lib/exhibitions";
import { getHomeFeaturedPlaces } from "@/lib/places";
import { getActivePrograms, getProgramRemainingSeats } from "@/lib/programs";
import { getPublicSpaces } from "@/lib/spaces";
import { getTalkRemainingByExhibitionIds } from "@/lib/talk-availability";
import { BRAND, brandTitle } from "@/lib/brand";

/** Public home shell — keep cacheable (no cookies()/getSession in this tree) */
export const revalidate = 60;

export const metadata = {
  title: { absolute: brandTitle() },
  description: BRAND.seoDescription,
  alternates: { canonical: "/" }
};

export default async function HomePage() {
  const today = getTodayKST();

  const [listedRaw, spaces, programs, artworks, curations, featuredPlaces] =
    await Promise.all([
      getListedExhibitions(today),
      getPublicSpaces(),
      getActivePrograms(),
      getFeaturedArtworks(12),
      getPublishedCurations(),
      getHomeFeaturedPlaces(5)
    ]);

  const activeExhibitions = filterActiveExhibitions(listedRaw, today);
  const listedExhibitions = listedRaw.slice(0, 36);
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

  const periodGroups = await getPeriodExhibitionGroups(today, listedRaw);

  const [talkRemainingById, programRemainingById] = await Promise.all([
    getTalkRemainingByExhibitionIds(talkExhibitions.map((exhibition) => exhibition.id)),
    getProgramRemainingSeats(programs.map((program) => program.id))
  ]);

  const situationalCurations: CurationSummary[] = [...curations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const hasClusterContent = spaces.length > 0;

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

        <HiddenPlacesSection places={featuredPlaces} />

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
