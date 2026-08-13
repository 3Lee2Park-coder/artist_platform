import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PlaceTipForm } from "@/components/PlaceTipForm";
import { ThemePreviewCard } from "@/components/ThemePreviewCard";
import { getPlaceById, PLACE_TYPE_LABEL } from "@/lib/places";
import { placeJsonLd, placeSeo, publicMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import Link from "next/link";
import { notFound } from "next/navigation";

type PlaceDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}.${Number(day)}`;
}

export async function generateMetadata({ params }: PlaceDetailPageProps) {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) {
    return { title: "장소를 찾을 수 없습니다", robots: { index: false } };
  }
  const seo = placeSeo(place);
  const canonical = `/places/${place.id}`;
  return publicMeta({
    title: seo.title,
    description: seo.description,
    canonical,
    images: [place.imageUrl]
  });
}

export default async function PlaceDetailPage({ params }: PlaceDetailPageProps) {
  const { id } = await params;
  const place = await getPlaceById(id);

  if (!place) {
    notFound();
  }

  const mapUrl =
    place.sourceUrl ||
    `https://map.naver.com/p/search/${encodeURIComponent(place.address || place.name)}`;

  const hasRelated =
    place.nearbyExhibitions.length > 0 || place.curations.length > 0;
  const seo = placeSeo(place);

  return (
    <>
      <JsonLd
        data={placeJsonLd({
          name: place.name,
          description: seo.description,
          canonical: `/places/${place.id}`,
          address: place.address,
          district: place.district,
          image: place.imageUrl
        })}
      />
      <Header />
      <main className="page-shell place-detail-page">
        <section className="place-detail-hero">
          <div
            className="place-detail-media"
            style={
              place.imageUrl
                ? {
                    backgroundImage: `url(${place.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }
                : undefined
            }
            aria-label={`${place.name} 대표 이미지`}
          />
          <div className="place-detail-copy">
            <p className="eyebrow">
              {PLACE_TYPE_LABEL[place.type] ?? place.type} · {place.district}
            </p>
            <h1>{place.name}</h1>
            {place.editorialNote || place.notes ? (
              <p className="place-detail-lead">
                {place.editorialNote || place.notes}
              </p>
            ) : (
              <p className="place-detail-lead">
                전시 곁에서 같이 가면 좋은 동네 장소입니다.
              </p>
            )}
            <p className="place-detail-address">{place.address}</p>
            <div className="place-detail-actions">
              <a
                className="primary-button"
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                지도에서 보기
              </a>
            </div>
          </div>
        </section>

        {hasRelated ? (
          <div className="place-related">
            {place.nearbyExhibitions.length > 0 ? (
              <section className="place-related-section">
                <div className="place-related-header">
                  <p className="eyebrow">함께 보기 좋은 전시</p>
                  <h2>이 장소 근처 전시</h2>
                  <p className="place-related-desc">
                    도보로 이어지는 진행 중 전시입니다. 장소를 보고 전시를 이어서
                    찾아보세요.
                  </p>
                </div>
                <div className="place-related-grid">
                  {place.nearbyExhibitions.map((exhibition) => (
                    <article key={exhibition.id} className="exhibition-card compact">
                      <div className="exhibition-card-media">
                        <Link
                          className="exhibition-card-link"
                          href={`/exhibitions/${exhibition.id}`}
                          aria-label={exhibition.title}
                        >
                          <div
                            className="exhibition-card-image"
                            style={
                              exhibition.heroImageUrl
                                ? {
                                    backgroundImage: `url(${exhibition.heroImageUrl})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center"
                                  }
                                : { background: exhibition.heroTone }
                            }
                            aria-hidden="true"
                          />
                        </Link>
                        <div className="card-badges">
                          <span className="place-distance-badge">
                            {exhibition.distanceText}
                          </span>
                        </div>
                      </div>
                      <Link
                        className="card-copy"
                        href={`/exhibitions/${exhibition.id}`}
                      >
                        <p className="card-location">
                          위치 · {exhibition.region} {exhibition.district}
                        </p>
                        <h3>{exhibition.title}</h3>
                        <p>{exhibition.artist}</p>
                        <div className="card-footer">
                          <span>
                            {formatDate(exhibition.startDate)} -{" "}
                            {formatDate(exhibition.endDate)}
                          </span>
                          <strong>{exhibition.venue}</strong>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {place.curations.length > 0 ? (
              <section className="place-related-section">
                <div className="place-related-header">
                  <p className="eyebrow">포함된 코스</p>
                  <h2>이 장소가 들어간 큐레이션</h2>
                  <p className="place-related-desc">
                    이 장소를 스톱으로 담은 동네 코스입니다. 동선 전체로 이어가 보세요.
                  </p>
                </div>
                <div className="place-related-grid place-related-grid--curations">
                  {place.curations.map((curation) => (
                    <ThemePreviewCard
                      key={curation.id}
                      label={curation.title}
                      description={
                        curation.subtitle ||
                        (curation.neighborhood
                          ? `${curation.neighborhood} 코스`
                          : "동네 코스")
                      }
                      href={`/curations/${curation.id}`}
                      tag="manual"
                      compact
                      coverImageUrl={curation.coverImageUrl}
                      coverTone={curation.coverTone}
                      footerLabel={
                        curation.durationText
                          ? `${curation.durationText} · 코스 보기`
                          : "코스 보기"
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        <section className="place-related-section place-tip-section">
          <div className="place-related-header">
            <p className="eyebrow">제보</p>
            <h2>비슷한 곳을 알고 있나요?</h2>
            <p className="place-related-desc">
              로그인 후 짧은 제보를 남겨 주세요. 검수 뒤 Place로 공개됩니다.
            </p>
          </div>
          <PlaceTipForm defaultDistrict={place.district} />
        </section>
      </main>
      <Footer />
    </>
  );
}
