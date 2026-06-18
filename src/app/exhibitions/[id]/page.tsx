import { ArtworkCard } from "@/components/ArtworkCard";
import { ExhibitionCard } from "@/components/ExhibitionCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
    exhibitions,
    getArtworksByExhibitionId,
    getExhibitionById
} from "@/data/exhibitions";
import Link from "next/link";
import { notFound } from "next/navigation";

type ExhibitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return exhibitions.map((exhibition) => ({
    id: exhibition.id
  }));
}

export async function generateMetadata({ params }: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = getExhibitionById(id);

  if (!exhibition) {
    return {
      title: "전시를 찾을 수 없습니다 | Exhibit"
    };
  }

  return {
    title: `${exhibition.title} | Exhibit`,
    description: exhibition.summary
  };
}

export default async function ExhibitionDetailPage({
  params
}: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = getExhibitionById(id);

  if (!exhibition) {
    notFound();
  }

  const exhibitionArtworks = getArtworksByExhibitionId(exhibition.id);
  const relatedExhibitions = exhibitions
    .filter(
      (item) =>
        item.id !== exhibition.id &&
        item.categories.some((category) => exhibition.categories.includes(category))
    )
    .slice(0, 3);

  return (
    <>
      <Header activeTab="전시" />

      <main className="detail-page">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">홈</Link>
          <span>/</span>
          <Link href="/map">지도</Link>
          <span>/</span>
          <strong>{exhibition.title}</strong>
        </nav>

        <section className="detail-hero">
          <div
            className="detail-hero-image"
            style={{ background: exhibition.heroTone }}
            aria-label={`${exhibition.title} 대표 이미지`}
          />

          <aside id="reservation" className="reservation-widget">
            <p className="eyebrow">Reservation</p>
            <h2>방문 예약</h2>
            <p>
              예약은 회원만 가능합니다. 비회원은 네이버 또는 이메일 가입 후 이어서
              예약합니다.
            </p>
            {exhibition.reservable ? (
              <>
                <div className="slot-grid" aria-label="예약 가능 시간">
                  {exhibition.reservationSlots.map((slot) => (
                    <button key={slot} type="button" className="slot-button">
                      {slot}
                    </button>
                  ))}
                </div>
                <button type="button" className="primary-button full-width">
                  예약하기
                </button>
              </>
            ) : (
              <div className="reservation-disabled">
                이 전시는 현재 직접 예약 대신 문의를 통해 방문 가능 여부를 확인합니다.
              </div>
            )}
            <div className="reservation-actions">
              <button type="button" className="secondary-button">
                문의하기
              </button>
              <button type="button" className="secondary-button">
                저장하기
              </button>
            </div>
            <p className="policy-note">
              반복 노쇼 제한 상태의 회원은 예약 확정 버튼이 비활성화됩니다.
            </p>
          </aside>
        </section>

        <section className="detail-layout">
          <article className="detail-main-copy">
            <p className="eyebrow">{exhibition.exhibitionType}</p>
            <h1>{exhibition.title}</h1>
            <p className="detail-summary">{exhibition.summary}</p>

            <dl className="detail-info-grid">
              <div>
                <dt>작가</dt>
                <dd>{exhibition.artist}</dd>
              </div>
              <div>
                <dt>장소</dt>
                <dd>
                  {exhibition.district} · {exhibition.venue}
                </dd>
              </div>
              <div>
                <dt>기간</dt>
                <dd>
                  {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
                </dd>
              </div>
              <div>
                <dt>카테고리</dt>
                <dd>{exhibition.categories.join(", ")}</dd>
              </div>
            </dl>

            <div className="detail-description">
              <h2>전시 소개</h2>
              <p>{exhibition.description}</p>
            </div>
          </article>

          <aside className="detail-side-card">
            <h3>운영 정보</h3>
            <ul>
              <li>큐레이션 {exhibition.curationAvailable ? "제공" : "미제공"}</li>
              <li>{exhibition.reservable ? "온라인 예약 가능" : "문의 후 방문"}</li>
              <li>{exhibition.exhibitionType}</li>
            </ul>
          </aside>
        </section>

        {exhibition.artistVideo ? (
          <section className="detail-section detail-video-section">
            <div>
              <p className="eyebrow">Artist video</p>
              <h2>작가 영상</h2>
              <p>작가가 업로드한 전시 소개 영상을 통해 공간의 분위기를 먼저 확인합니다.</p>
            </div>
            <div
              className="detail-video-poster"
              style={{ background: exhibition.artistVideo.posterTone }}
            >
              <span>Play</span>
              <strong>{exhibition.artistVideo.duration}</strong>
            </div>
          </section>
        ) : null}

        <section className="detail-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Artworks</p>
              <h2>전시 작품</h2>
              <p className="section-description">
                가격 공개 여부와 판매 가능 여부는 작가가 등록한 작품 정보 기준으로 표시됩니다.
              </p>
            </div>
          </div>
          <div className="artwork-grid">
            {exhibitionArtworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        </section>

        <section className="detail-section venue-section">
          <div>
            <p className="eyebrow">Venue</p>
            <h2>장소와 지도</h2>
            <p>
              {exhibition.address}
              <br />
              Naver Map SDK 연동 시 좌표({exhibition.mapPosition.lat},{" "}
              {exhibition.mapPosition.lng})를 Marker로 사용합니다.
            </p>
            <Link className="secondary-button" href="/map">
              지도 화면에서 보기
            </Link>
          </div>
          <div className="detail-map-preview" aria-label="Naver Map 미리보기">
            <span className="detail-map-pin">{exhibition.district}</span>
          </div>
        </section>

        {relatedExhibitions.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Related</p>
                <h2>비슷한 전시</h2>
              </div>
            </div>
            <div className="exhibition-grid">
              {relatedExhibitions.map((item) => (
                <ExhibitionCard key={`related-${item.id}`} exhibition={item} compact />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}월 ${Number(day)}일`;
}