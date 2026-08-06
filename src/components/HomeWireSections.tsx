import { AllExhibitionsSectionClient } from "@/components/AllExhibitionsSectionClient";
import { ArtworkCard } from "@/components/ArtworkCard";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import type { Artwork, Exhibition } from "@/types/exhibition";
import Link from "next/link";

type ArtworkDiscoverySectionProps = {
  artworks: Artwork[];
};

export function ArtworkDiscoverySection({ artworks }: ArtworkDiscoverySectionProps) {
  if (artworks.length === 0) {
    return null;
  }

  return (
    <section className="home-section">
      <HomeSectionHeader
        eyebrow="작품으로 발견"
        title="이 작품에서 시작해 보세요"
        description="마음에 드는 작품에서 작가의 공간·전시로 이어져 보세요. 울타리 밖의 만남이 가깝습니다."
      />

      <div className="artwork-grid">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} linkToExhibition />
        ))}
      </div>
    </section>
  );
}

type AllExhibitionsSectionProps = {
  exhibitions: Exhibition[];
};

export function AllExhibitionsSection({ exhibitions }: AllExhibitionsSectionProps) {
  return <AllExhibitionsSectionClient exhibitions={exhibitions} />;
}

export function SupplierCtaSection() {
  return (
    <section className="home-section home-section-footer">
      <div className="supplier-cta">
        <div>
          <p className="supplier-cta-title">작업이 있는 곳을 직접 열어 보세요</p>
          <p className="supplier-cta-sub">
            공간·전시·프로그램 등록은 무료입니다. 관객에게 다가가는 창구를 같이
            만들어 갑시다.
          </p>
        </div>
        <Link href="/for-artists" className="secondary-button">
          작가로 열기
        </Link>
      </div>
    </section>
  );
}
