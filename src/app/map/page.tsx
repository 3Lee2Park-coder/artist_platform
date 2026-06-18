import Link from "next/link";
import type { CSSProperties } from "react";
import { ExhibitionCard } from "@/components/ExhibitionCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getActiveExhibitions } from "@/data/exhibitions";

const pinPositions = [
  { left: "54%", top: "54%" },
  { left: "42%", top: "48%" },
  { left: "31%", top: "60%" },
  { left: "47%", top: "34%" },
  { left: "27%", top: "51%" },
  { left: "39%", top: "44%" }
];

export const metadata = {
  title: "지도에서 전시 찾기 | Exhibit",
  description: "Naver Map 기반 위치 탐색 화면"
};

export default function MapPage() {
  const activeExhibitions = getActiveExhibitions();

  return (
    <>
      <Header activeTab="지도" />

      <main className="map-page">
        <section className="map-shell" aria-labelledby="map-title">
          <aside className="map-side-panel">
            <div className="map-panel-heading">
              <p className="eyebrow">Naver Map</p>
              <h1 id="map-title">지도에서 전시 찾기</h1>
              <p>
                날짜와 장소 조건에 맞는 전시를 리스트와 지도 핀으로 함께 확인합니다.
                지도는 전시 상세 진입을 돕는 보조 탐색 화면입니다.
              </p>
            </div>

            <div className="map-filter-summary" aria-label="현재 지도 필터">
              <span>오늘 - 이번주</span>
              <span>서울 주요 전시 지역</span>
              <span>큐레이션 전체</span>
            </div>

            <div className="map-result-list">
              {activeExhibitions.map((exhibition) => (
                <ExhibitionCard key={exhibition.id} exhibition={exhibition} compact />
              ))}
            </div>
          </aside>

          <section className="naver-map-panel" aria-label="Naver Map 전시 위치">
            <div className="map-brand-badge">Naver Map preview</div>
            {activeExhibitions.map((exhibition, index) => (
              <Link
                key={`pin-${exhibition.id}`}
                className="map-pin"
                href={`/exhibitions/${exhibition.id}`}
                style={pinPositions[index] as CSSProperties}
                aria-label={`${exhibition.title} 위치 보기`}
              >
                <span>{index + 1}</span>
                <strong>{exhibition.district}</strong>
              </Link>
            ))}

            <div className="map-floating-card">
              <strong>성수 · 한남 · 홍대 중심</strong>
              <p>Naver Map SDK 연동 전 목업이며, 실제 구현 시 좌표 기반 Marker로 대체합니다.</p>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}
