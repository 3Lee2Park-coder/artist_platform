import { ArtworkCard } from "@/components/ArtworkCard";
import { ExhibitionCard } from "@/components/ExhibitionCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HomeHeroModule } from "@/components/HomeHeroModule";
import { SectionHeader } from "@/components/SectionHeader";
import { VideoSpotlight } from "@/components/VideoSpotlight";
import {
  artworks,
  exhibitions,
  getActiveExhibitions,
  getCategoryExhibitionGroups,
  getVideoExhibitions
} from "@/data/exhibitions";

export default function HomePage() {
  const activeExhibitions = getActiveExhibitions();
  const discoveryExhibitions = activeExhibitions.filter(
    (exhibition) => exhibition.popular || exhibition.todayOpen
  );
  const categoryGroups = getCategoryExhibitionGroups();
  const nearbyExhibitions = exhibitions.filter((exhibition) => exhibition.nearby);
  const videoExhibitions = getVideoExhibitions();

  return (
    <>
      <Header />

      <main className="page-shell">
        <HomeHeroModule />

        <section className="content-section">
          <SectionHeader
            eyebrow="Discovery"
            title="오늘의 발견"
            description="오늘 열려 있거나 이번 주 주목도가 높은 전시를 작품 중심 카드로 발견해보세요."
            actionLabel="전체 보기"
          />
          <div className="exhibition-grid discovery-grid">
            {discoveryExhibitions.slice(0, 4).map((exhibition) => (
              <ExhibitionCard key={exhibition.id} exhibition={exhibition} />
            ))}
          </div>
        </section>

        {categoryGroups.map((group) => (
          <section key={group.category} className="content-section">
            <SectionHeader
              eyebrow="Active category"
              title={group.title}
              description={`${group.category} 카테고리에 현재 진행 중인 전시만 모았습니다.`}
              actionLabel={`${group.category} 더보기`}
            />
            <div className="exhibition-grid">
              {group.exhibitions.slice(0, 4).map((exhibition) => (
                <ExhibitionCard
                  key={`${group.category}-${exhibition.id}`}
                  exhibition={exhibition}
                  compact
                />
              ))}
            </div>
          </section>
        ))}

        <section className="content-section">
          <SectionHeader
            eyebrow="Artwork first"
            title="작품으로 발견하는 전시"
            description="작가가 등록한 작품 일부를 랜덤 큐레이션처럼 노출해, 작품에서 전시 상세로 이어지게 합니다."
            actionLabel="작품 더보기"
          />
          <div className="artwork-grid">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        </section>

        <VideoSpotlight exhibitions={videoExhibitions} />

        <section className="content-section">
          <SectionHeader
            eyebrow="Nearby"
            title="근처에서 볼 수 있는 전시"
            description="지도 탐색은 보조 흐름으로 두고, 홈에서는 가까운 전시를 간단히 추천합니다."
            actionLabel="지도에서 보기"
          />
          <div className="nearby-list">
            {nearbyExhibitions.map((exhibition) => (
              <ExhibitionCard key={`nearby-${exhibition.id}`} exhibition={exhibition} compact />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
