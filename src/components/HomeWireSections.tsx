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
        title="이 작품이 궁금하다면"
        description="마음에 드는 작품에서 시작해, 그 작가의 전시로 이어져 보세요."
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
          <p className="supplier-cta-title">내 작업과 전시를 소개하고 싶다면</p>
          <p className="supplier-cta-sub">
            작가는 무료로 공간·전시·프로그램을 올릴 수 있어요. 관람객이 찾아오는
            첫 창구가 되어 드립니다.
          </p>
        </div>
        <Link href="/register" className="secondary-button">
          작가로 시작하기
        </Link>
      </div>
    </section>
  );
}
