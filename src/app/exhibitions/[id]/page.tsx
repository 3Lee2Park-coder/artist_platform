import { ArtworkCard } from "@/components/ArtworkCard";
import { CollectActions } from "@/components/CollectActions";
import { ExhibitionAsk } from "@/components/ExhibitionAsk";
import { ExhibitionCourseSection } from "@/components/ExhibitionCourseSection";
import { ExhibitionPublicQa } from "@/components/ExhibitionPublicQa";
import { ExhibitionReviewPanel } from "@/components/ExhibitionReviewPanel";
import { ExhibitionVenueMap } from "@/components/ExhibitionVenueMap";
import { ShareActionButton } from "@/components/ShareActionButton";
import { ExhibitionStickyBar } from "@/components/ExhibitionStickyBar";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { isCardSaved, makeCardKey } from "@/lib/cards";
import { getTodayKST } from "@/lib/date";
import { getExhibitionCourseContext } from "@/lib/exhibition-context";
import { logEvent } from "@/lib/events";
import { listPublicQuestionsForExhibition } from "@/lib/public-questions";
import { entityKeywords, exhibitionJsonLd, exhibitionSeo, publicMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { detectTrafficChannel } from "@/lib/traffic-channel";
import {
  SOURCE_BADGE,
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
      title: "전시를 찾을 수 없습니다",
      robots: { index: false }
    };
  }

  const seo = exhibitionSeo(exhibition);
  const canonical = `/exhibitions/${exhibition.id}`;
  return publicMeta({
    title: seo.title,
    description: seo.description,
    canonical,
    images: [exhibition.heroImageUrl],
    keywords: entityKeywords(
      exhibition.title,
      exhibition.artist,
      exhibition.district,
      exhibition.venue,
      "전시 추천",
      "동네 전시"
    )
  });
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

  const today = getTodayKST();
  const isEnded = exhibition.endDate < today;
  const isUpcoming = exhibition.startDate > today;
  const fromCuration = from === "curation" && Boolean(curationId);
  const channel = fromCuration ? "internal" : await detectTrafficChannel();

  await logEvent({
    type: "EXHIBITION_VIEW",
    userId: session?.id,
    userRole: session?.role,
    exhibitionId: exhibition.id,
    source: fromCuration ? "curation" : "detail_page",
    metadata: {
      channel,
      ...(fromCuration ? { curationId, from: "curation" } : {}),
      ended: isEnded
    }
  });

  const cardKey = makeCardKey("exhibition", exhibition.id);
  const [exhibitionArtworks, viewerState, cardSaved, courseContext, reviewBundle, publicQa] =
    await Promise.all([
      getArtworksByExhibitionId(exhibition.id),
      getViewerExhibitionState(exhibition.id, session?.id),
      isCardSaved(session?.id, cardKey),
      getExhibitionCourseContext(
        exhibition.id,
        exhibition.mapPosition.lat,
        exhibition.mapPosition.lng
      ),
      getExhibitionReviews(exhibition.id, session?.id),
      listPublicQuestionsForExhibition(exhibition.id)
    ]);
  const { reviews, stats, myReview } = reviewBundle;
  const badge = SOURCE_BADGE[exhibition.source];
  const descriptionParagraphs = exhibition.description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const pageSeo = exhibitionSeo(exhibition);
  const primaryCourse = courseContext.courses[0] ?? null;
  const periodLabel = isEnded ? "종료" : isUpcoming ? "예정" : "진행 중";
  const visitLabel = exhibition.reservable ? "온라인 예약" : "현장 방문";

  return (
    <>
      <JsonLd
        data={exhibitionJsonLd({
          title: exhibition.title,
          description: pageSeo.description,
          canonical: `/exhibitions/${exhibition.id}`,
          venue: exhibition.venue,
          address: exhibition.address,
          district: exhibition.district,
          artist: exhibition.artist,
          startDate: exhibition.startDate,
          endDate: exhibition.endDate,
          image: exhibition.heroImageUrl,
          lat: exhibition.mapPosition?.lat,
          lng: exhibition.mapPosition?.lng
        })}
      />
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

        {isEnded ? (
          <div className="status-banner warn exhibition-ended-banner" role="status">
            <strong>이 전시는 {formatDate(exhibition.endDate)}에 종료되었습니다.</strong>
            {primaryCourse ? (
              <span>
                {" "}
                같은 동네의 진행 중 코스를 보려면{" "}
                <Link href={`/decks/${primaryCourse.id}`}>
                  {primaryCourse.title}
                </Link>
                을 열어 보세요.
              </span>
            ) : courseContext.nextStops[0] ? (
              <span>
                {" "}
                근처에서 이어갈 곳은{" "}
                <Link href={courseContext.nextStops[0].href}>
                  {courseContext.nextStops[0].title}
                </Link>
                입니다.
              </span>
            ) : (
              <span>
                {" "}
                <Link href="/decks">다른 코스</Link>나{" "}
                <Link href="/map">지도</Link>에서 진행 중 전시를 찾아보세요.
              </span>
            )}
          </div>
        ) : null}

        <section className="detail-hero">
          <div className="detail-hero-image">
            <span className={`source-badge ${badge.tone}`}>{badge.label}</span>
            {isEnded ? <span className="source-badge public">종료</span> : null}
            {exhibition.heroImageUrl ? (
              <img
                className="detail-hero-photo"
                src={exhibition.heroImageUrl}
                alt={`${exhibition.title} 대표 이미지`}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className="detail-hero-fallback"
                style={{ background: exhibition.heroTone }}
                aria-label={`${exhibition.title} 대표 이미지`}
              />
            )}
          </div>
        </section>

        <section className="detail-layout">
          <article className="detail-main-copy">
            <p className="eyebrow">
              {exhibition.exhibitionType}
              {exhibition.categories.length
                ? ` · ${exhibition.categories.join(", ")}`
                : ""}
            </p>
            <h1>{exhibition.title}</h1>
            <p className="detail-summary">{exhibition.summary}</p>

            {/* NOL/인터파크처럼 제목 바로 아래 사실만 — 새 섹션 타이틀 없이 기존 그리드 확장 */}
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
                      </Link>
                      <span className="detail-info-sub">
                        {exhibition.region} {exhibition.district}
                      </span>
                    </>
                  ) : (
                    <>
                      {exhibition.venue}
                      <span className="detail-info-sub">
                        {exhibition.region} {exhibition.district}
                      </span>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>기간</dt>
                <dd>
                  {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
                  <span className={`detail-info-chip${isEnded ? " is-ended" : ""}`}>
                    {periodLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt>입장</dt>
                <dd>
                  {visitLabel}
                  {exhibition.address ? (
                    <span className="detail-info-sub">{exhibition.address}</span>
                  ) : null}
                </dd>
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

            <CollectActions
              cardKey={cardKey}
              isLoggedIn={Boolean(session)}
              loginRedirect={`/exhibitions/${exhibition.id}`}
              initialSaved={cardSaved || viewerState.saved}
            />
            {publicQa.length > 0 ? <ExhibitionPublicQa items={publicQa} /> : null}
            <ExhibitionAsk
              exhibitionId={exhibition.id}
              title={exhibition.title}
              artistName={exhibition.artist}
              venueName={exhibition.space?.name || exhibition.venue}
              isLoggedIn={Boolean(session)}
            />
          </article>

          <aside className="detail-side-card">
            <h3>운영 정보</h3>
            <ul>
              <li>{periodLabel}</li>
              <li>{visitLabel}</li>
              <li>{exhibition.exhibitionType}</li>
            </ul>
            {primaryCourse ? (
              <div className="detail-side-course">
                <p className="detail-side-course-label">같은 날 이어서</p>
                <Link
                  href={`/decks/${primaryCourse.id}?open=1`}
                  className="detail-side-course-link"
                >
                  <span
                    className="detail-side-course-thumb"
                    style={
                      primaryCourse.coverImageUrl
                        ? { backgroundImage: `url(${primaryCourse.coverImageUrl})` }
                        : { background: primaryCourse.coverTone }
                    }
                    aria-hidden
                  />
                  <span className="detail-side-course-copy">
                    <strong>{primaryCourse.title}</strong>
                    <span>
                      {primaryCourse.durationText ||
                        (primaryCourse.neighborhood
                          ? `${primaryCourse.neighborhood} 코스`
                          : `${primaryCourse.stopCount}곳 코스`)}
                    </span>
                    <em>코스 펼쳐보기 →</em>
                  </span>
                </Link>
              </div>
            ) : null}
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

        <ExhibitionCourseSection
          exhibitionId={exhibition.id}
          courses={courseContext.courses}
          nextStops={courseContext.nextStops}
          source={courseContext.source}
        />

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
      </main>

      <ExhibitionStickyBar
        exhibitionId={exhibition.id}
        reservable={false}
        isLoggedIn={Boolean(session)}
        initialSaved={viewerState.saved}
        courseHref={
          primaryCourse
            ? `/decks/${primaryCourse.id}?open=1`
            : courseContext.nextStops.length
              ? "#course-next"
              : null
        }
        courseLabel={primaryCourse ? "주변 코스 보기" : courseContext.nextStops.length ? "근처 보기" : null}
        courseId={primaryCourse?.id ?? null}
      />

      <Footer />
    </>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}월 ${Number(day)}일`;
}
