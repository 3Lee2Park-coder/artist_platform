import { ArtworkCard } from "@/components/ArtworkCard";
import { ExhibitionCard } from "@/components/ExhibitionCard";
import { ExhibitionReviewPanel } from "@/components/ExhibitionReviewPanel";
import { ExhibitionVenueMap } from "@/components/ExhibitionVenueMap";
import { ShareActionButton } from "@/components/ShareActionButton";
import { ExhibitionStickyBar } from "@/components/ExhibitionStickyBar";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ReservationWidget } from "@/components/ReservationWidget";
import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import {
  SOURCE_BADGE,
  getAllExhibitions,
  getArtworksByExhibitionId,
  getExhibitionById,
  getExhibitionReviews,
  getViewerExhibitionState
} from "@/lib/exhibitions";
import Link from "next/link";
import { notFound } from "next/navigation";

type ExhibitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    from?: string;
    curationId?: string;
    registered?: string;
  }>;
};

export async function generateMetadata({ params }: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = await getExhibitionById(id);

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
  params,
  searchParams
}: ExhibitionDetailPageProps) {
  const { id } = await params;
  const { from, curationId, registered } = await searchParams;
  const exhibition = await getExhibitionById(id);
  const session = await getSession();

  if (!exhibition) {
    notFound();
  }

  const fromCuration = from === "curation" && Boolean(curationId);
  await logEvent({
    type: "EXHIBITION_VIEW",
    userId: session?.id,
    exhibitionId: exhibition.id,
    source: fromCuration ? "curation" : "detail_page",
    metadata: fromCuration ? { curationId, from: "curation" } : undefined
  });

  const exhibitionArtworks = await getArtworksByExhibitionId(exhibition.id);
  const allExhibitions = await getAllExhibitions();
  const relatedExhibitions = allExhibitions
    .filter(
      (item) =>
        item.id !== exhibition.id &&
        item.categories.some((category) => exhibition.categories.includes(category))
    )
    .slice(0, 3);

  const viewerState = await getViewerExhibitionState(exhibition.id, session?.id);
  const { reviews, stats, myReview } = await getExhibitionReviews(
    exhibition.id,
    session?.id
  );
  const badge = SOURCE_BADGE[exhibition.source];
  const descriptionParagraphs = exhibition.description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

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

        {registered === "1" ? (
          <div className="status-banner ok" style={{ marginBottom: 16 }}>
            전시가 등록되었습니다. 홈의 «작가 등록 전시»·검색·전체 전시에
            노출됩니다.{" "}
            <Link href="/exhibitions?source=artist">작가 전시 목록 보기</Link>
            {" · "}
            <Link href="/my">MY에서 노출 상태 확인</Link>
          </div>
        ) : null}

        <section className="detail-hero">
          <div
            className="detail-hero-image"
            style={
              exhibition.heroImageUrl
                ? {
                    backgroundImage: `url(${exhibition.heroImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }
                : { background: exhibition.heroTone }
            }
            aria-label={`${exhibition.title} 대표 이미지`}
          >
            <span className={`source-badge ${badge.tone}`}>{badge.label}</span>
          </div>

          <div id="reservation">
            <ReservationWidget
              exhibition={exhibition}
              isLoggedIn={Boolean(session)}
              userName={session?.name}
            />
          </div>
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
                  {exhibition.space ? (
                    <>
                      <Link className="text-link" href={`/spaces/${exhibition.space.slug}`}>
                        {exhibition.space.name}
                      </Link>{" "}
                      · {exhibition.region} {exhibition.district}
                    </>
                  ) : (
                    <>
                      {exhibition.region} {exhibition.district} · {exhibition.venue}
                    </>
                  )}
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
              {descriptionParagraphs.map((paragraph, index) => (
                <p key={`desc-${index}`}>{paragraph}</p>
              ))}
              {exhibition.descriptionImages.length > 0 ? (
                <div className="detail-description-gallery">
                  {exhibition.descriptionImages.map((src, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`desc-img-${index}`}
                      src={src}
                      alt={`${exhibition.title} 소개 이미지 ${index + 1}`}
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </article>

          <aside className="detail-side-card">
            <h3>운영 정보</h3>
            <ul>
              <li>큐레이션 {exhibition.curationAvailable ? "제공" : "미제공"}</li>
              <li>{exhibition.reservable ? "온라인 예약 가능" : "문의 후 방문"}</li>
              <li>{exhibition.exhibitionType}</li>
            </ul>
            <div className="share-action-stack">
              <ShareActionButton
                label="전시 공유"
                title={exhibition.title}
                text={`${exhibition.title} · ${exhibition.venue}에서 만나는 전시`}
                path={`/share/exhibitions/${exhibition.id}`}
                eventType="EXHIBITION_SHARE"
                exhibitionId={exhibition.id}
                source="detail_side_card"
              />
              {exhibition.source === "ARTIST" ? (
                <ShareActionButton
                  label="작가 홍보 링크"
                  title={`${exhibition.title} 예약 안내`}
                  text={`작가와 만날 수 있는 전시 ${exhibition.title}을 확인해보세요.`}
                  path={`/share/exhibitions/${exhibition.id}?from=artist`}
                  eventType="ARTIST_SHARE"
                  exhibitionId={exhibition.id}
                  source="artist_detail_side_card"
                />
              ) : null}
            </div>
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
              {exhibition.artistVideo.videoUrl ? (
                <video
                  controls
                  className="detail-video-player"
                  src={exhibition.artistVideo.videoUrl}
                  poster={exhibition.heroImageUrl}
                />
              ) : (
                <>
                  <span>Play</span>
                  <strong>{exhibition.artistVideo.duration}</strong>
                </>
              )}
            </div>
          </section>
        ) : null}

        {exhibitionArtworks.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Artworks</p>
                <h2>전시 작품</h2>
              </div>
            </div>
            <div className="artwork-grid">
              {exhibitionArtworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
              ))}
            </div>
          </section>
        ) : null}

        <ExhibitionVenueMap
          exhibitionId={exhibition.id}
          title={exhibition.title}
          venue={exhibition.venue}
          address={exhibition.address}
          region={exhibition.region}
          district={exhibition.district}
          lat={exhibition.mapPosition.lat}
          lng={exhibition.mapPosition.lng}
        />

        <ExhibitionReviewPanel
          exhibitionId={exhibition.id}
          isLoggedIn={Boolean(session)}
          initialVisited={viewerState.visited}
          stats={stats}
          reviews={reviews}
          myReview={myReview}
        />

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

      <ExhibitionStickyBar
        exhibitionId={exhibition.id}
        reservable={exhibition.reservable}
        isLoggedIn={Boolean(session)}
        initialSaved={viewerState.saved}
      />

      <Footer />
    </>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}월 ${Number(day)}일`;
}
