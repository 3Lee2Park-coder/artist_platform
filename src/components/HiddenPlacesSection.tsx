import { HiddenPlacesTipCta, HiddenPlacesTipFallback } from "@/components/HiddenPlacesTipCta";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { InteractiveOoofCardList } from "@/components/InteractiveOoofCard";
import { cardFromPlace } from "@/lib/card-mappers";
import type { PlaceCard } from "@/lib/places";
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
        description="OOOF.가 직접 살펴보고 고른 동네 장소입니다. 전시를 보기 전후 함께 들르기 좋은 곳을 소개합니다."
      />

      {places.length > 0 ? (
        <InteractiveOoofCardList
          className="ooof-catalog-rail"
          cards={places.map((place, index) => cardFromPlace(place, index))}
        />
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
