"use client";

import { NaverMap, type MapMarker } from "@/components/NaverMap";
import Link from "next/link";

type ExhibitionVenueMapProps = {
  exhibitionId: string;
  title: string;
  venue: string;
  address: string;
  region: string;
  district: string;
  lat: number;
  lng: number;
};

export function ExhibitionVenueMap({
  exhibitionId,
  title,
  venue,
  address,
  region,
  district,
  lat,
  lng
}: ExhibitionVenueMapProps) {
  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);

  const markers: MapMarker[] = hasCoords
    ? [
        {
          id: exhibitionId,
          kind: "exhibition",
          lat,
          lng,
          title: venue || title,
          district
        }
      ]
    : [];

  return (
    <section className="detail-section venue-section">
      <div>
        <p className="eyebrow">Venue</p>
        <h2>장소와 지도</h2>
        <p>
          {address || `${region} ${district} · ${venue}`}
          {hasCoords ? null : (
            <>
              <br />
              <span className="field-hint">
                정확한 좌표가 없어 지도 미리보기를 생략했습니다.
              </span>
            </>
          )}
        </p>
        <div className="venue-actions">
          <Link
            className="secondary-button"
            href={`/map?layer=exhibition&focus=${encodeURIComponent(exhibitionId)}`}
          >
            지도 화면에서 보기
          </Link>
          {hasCoords ? (
            <a
              className="secondary-button"
              href={`https://map.naver.com/p/search/${encodeURIComponent(address || `${venue} ${district}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              네이버 지도
            </a>
          ) : null}
        </div>
      </div>

      {hasCoords ? (
        <div className="detail-map-preview detail-map-live" aria-label="전시 위치 지도">
          <NaverMap
            markers={markers}
            selectedId={exhibitionId}
            clustering={false}
            fitBounds={false}
            pinVariant="compact"
          />
        </div>
      ) : null}
    </section>
  );
}
