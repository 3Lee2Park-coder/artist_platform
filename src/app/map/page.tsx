import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MapPageClient, type MapLayer } from "@/components/MapPageClient";
import { getActiveExhibitions, getPublishedCurations } from "@/lib/exhibitions";
import { getActivePrograms } from "@/lib/programs";
import { getPublicSpaces } from "@/lib/spaces";

export const metadata = {
  title: "서울 전시 지도 · 가볼만한 곳",
  description:
    "서울 가볼만한 곳, 전시, 작가 공간, 데이트 코스를 지도에서 한 번에 확인합니다.",
  alternates: { canonical: "/map" }
};

export const revalidate = 60;

type MapPageProps = {
  searchParams: Promise<{ layer?: string; focus?: string }>;
};

function toLayer(value?: string): MapLayer | undefined {
  if (value === "curation" || value === "space" || value === "exhibition") {
    return value;
  }
  return undefined;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const { layer, focus } = await searchParams;
  const [activeExhibitions, spaces, programs, curations] = await Promise.all([
    getActiveExhibitions(),
    getPublicSpaces(),
    getActivePrograms(),
    getPublishedCurations()
  ]);

  return (
    <>
      <Header activeTab="지도" />

      <main className="map-page">
        <MapPageClient
          exhibitions={activeExhibitions}
          spaces={spaces}
          programs={programs}
          curations={curations}
          initialLayer={toLayer(layer) ?? (focus ? "exhibition" : undefined)}
          initialFocusId={focus}
        />
      </main>

      <Footer />
    </>
  );
}
