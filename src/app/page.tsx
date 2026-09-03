import {
  AllExhibitionsSection,
  SupplierCtaSection
} from "@/components/HomeWireSections";
import { HiddenPlacesSection } from "@/components/HiddenPlacesSection";
import { HomeHeroSlider } from "@/components/HomeHeroSlider";
import { PeriodExhibitionSection } from "@/components/PeriodExhibitionSection";
import { TodayDeckSection } from "@/components/TodayDeckSection";
import { WeekendPlanTeaser } from "@/components/WeekendPlanTeaser";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getTodayKST } from "@/lib/date";
import {
  getHomeHeroExhibitions,
  getListedExhibitions,
  getPeriodExhibitionGroups,
  getPublishedCurations
} from "@/lib/exhibitions";
import { getHomeFeaturedPlaces } from "@/lib/places";
import { getHomeWalkers } from "@/lib/walkers";
import { ArtistWalkers } from "@/components/ArtistWalkers";
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

  const [listedRaw, curations, featuredPlaces, walkers] = await Promise.all([
    getListedExhibitions(today),
    getPublishedCurations(),
    getHomeFeaturedPlaces(8),
    getHomeWalkers(6)
  ]);

  const listedExhibitions = listedRaw.slice(0, 36);
  const heroExhibitions = await getHomeHeroExhibitions(today, 6);

  const periodGroups = await getPeriodExhibitionGroups(today, listedRaw);

  return (
    <>
      <Header />

      <main className="page-shell home-wire">
        <HomeHeroSlider exhibitions={heroExhibitions} />
        <ArtistWalkers walkers={walkers} />

        {/*
          방문 퍼널: 덱(상품) → 마감 임박 전시 → 곁장소 → 전시 목록.
          코스 선택은 덱 상세의 지도가 맡으므로 SituationalCurationSection은 홈에서 뺀다.
          작품/공방 디렉터리, 작가 만남(MeetArtist)은 재고가 얇아 숨긴 상태.
        */}
        <TodayDeckSection curations={curations} />
        <WeekendPlanTeaser />

        <PeriodExhibitionSection groups={periodGroups} />

        <HiddenPlacesSection places={featuredPlaces} />

        <AllExhibitionsSection exhibitions={listedExhibitions} />

        <SupplierCtaSection />
      </main>

      <Footer />
    </>
  );
}
