import { HiddenPlacesTipCta, HiddenPlacesTipFallback } from "@/components/HiddenPlacesTipCta";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import type { PlaceCard } from "@/lib/places";
import Link from "next/link";
import { Suspense } from "react";

type HiddenPlacesSectionProps = {
  places: PlaceCard[];
};

export function HiddenPlacesSection({ places }: HiddenPlacesSectionProps) {
  return (
    <section className="home-section hidden-places-section" id="hidden-places">
      <HomeSectionHeader
        eyebrow="나만 알고 싶었던 곳인데"
        title="전시 곁의 숨은 장소"
        description="운영이 고른 동네 장소입니다. 전시를 보기 전후, 같이 가면 좋은 곳으로 이어집니다."
      />

      {places.length > 0 ? (
        <div className="hidden-place-grid">
          {places.map((place) => (
            <Link
              key={place.id}
              href={`/places/${place.id}`}
              className="hidden-place-card"
            >
              <div
                className="hidden-place-media"
                style={
                  place.imageUrl
                    ? {
                        backgroundImage: `url(${place.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                      }
                    : undefined
                }
                aria-hidden="true"
              />
              <div className="hidden-place-copy">
                <p className="hidden-place-meta">
                  {place.typeLabel} · {place.district}
                </p>
                <h3>{place.name}</h3>
                {place.editorialNote || place.notes ? (
                  <p className="hidden-place-note">
                    {place.editorialNote || place.notes}
                  </p>
                ) : null}
                {place.nearbyExhibition ? (
                  <p className="hidden-place-nearby">
                    근처 전시 · {place.nearbyExhibition.title}
                    <span> · {place.nearbyExhibition.distanceText}</span>
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="auth-description">
          곧 숨은 장소를 올릴 예정입니다. 알고 있는 곳이 있다면 먼저 제보해 주세요.
        </p>
      )}

      <Suspense fallback={<HiddenPlacesTipFallback />}>
        <HiddenPlacesTipCta />
      </Suspense>
    </section>
  );
}
