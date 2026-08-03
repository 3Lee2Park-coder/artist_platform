import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ShareActionButton } from "@/components/ShareActionButton";
import { SOURCE_BADGE, getExhibitionById } from "@/lib/exhibitions";
import Link from "next/link";
import { notFound } from "next/navigation";

type ExhibitionSharePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: ExhibitionSharePageProps) {
  const { id } = await params;
  const exhibition = await getExhibitionById(id);

  if (!exhibition) {
    return { title: "전시 공유 | Exhibit" };
  }

  return {
    title: `${exhibition.title} 공유 | Exhibit`,
    description: `${exhibition.venue}에서 열리는 ${exhibition.title} 전시를 확인해보세요.`,
    openGraph: {
      title: exhibition.title,
      description: exhibition.summary,
      images: exhibition.heroImageUrl ? [exhibition.heroImageUrl] : undefined
    }
  };
}

export default async function ExhibitionSharePage({
  params,
  searchParams
}: ExhibitionSharePageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const exhibition = await getExhibitionById(id);

  if (!exhibition) {
    notFound();
  }

  const badge = SOURCE_BADGE[exhibition.source];
  const isArtistShare = from === "artist";

  return (
    <>
      <Header activeTab="전시" />
      <main className="share-page">
        <section className="share-card hero-share-card">
          <div
            className="share-card-image"
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
          <div className="share-card-copy">
            <p className="eyebrow">
              {isArtistShare ? "Artist invitation" : "Exhibition share"}
            </p>
            <h1>{exhibition.title}</h1>
            <p className="share-lead">{exhibition.summary}</p>
            <dl className="share-info-grid">
              <div>
                <dt>장소</dt>
                <dd>
                  {exhibition.region} {exhibition.district} · {exhibition.venue}
                </dd>
              </div>
              <div>
                <dt>기간</dt>
                <dd>
                  {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
                </dd>
              </div>
              <div>
                <dt>예약</dt>
                <dd>{exhibition.reservable ? "온라인 예약 가능" : "문의 후 방문"}</dd>
              </div>
            </dl>
            <div className="share-cta-row">
              <Link className="primary-button" href={`/exhibitions/${exhibition.id}#reservation`}>
                전시 보러가기
              </Link>
              <ShareActionButton
                label="다시 공유"
                title={exhibition.title}
                text={`${exhibition.title} · ${exhibition.venue}에서 만나는 전시`}
                path={`/share/exhibitions/${exhibition.id}${isArtistShare ? "?from=artist" : ""}`}
                eventType={isArtistShare ? "ARTIST_SHARE" : "EXHIBITION_SHARE"}
                exhibitionId={exhibition.id}
                source="share_landing"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");

  return `${Number(month)}월 ${Number(day)}일`;
}
