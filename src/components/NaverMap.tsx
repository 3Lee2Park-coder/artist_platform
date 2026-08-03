"use client";

import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MapBasePlace = {
  name: string;
  lat: number;
  lng: number;
};

// 지도에 그릴 수 있는 대상 — 전시 외에 공간/프로그램/장소/큐레이션 정차 지점 지원
export type MapMarkerKind = "space" | "exhibition" | "program" | "place" | "stop";

export type MapMarker = {
  id: string;
  kind: MapMarkerKind;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  /** 상태·시간 등 강조 배지 (예: "오늘 방문 가능", "8/9 14:00") */
  badge?: string;
  badgeTone?: "ok" | "caution" | "closed" | "unknown" | "accent";
  /** 큐레이션 동선 순번 */
  order?: number;
  district?: string;
};

export type MapPinVariant = "default" | "compact";

type NaverMapProps = {
  exhibitions?: Exhibition[];
  markers?: MapMarker[];
  /** 순서대로 잇는 동선 (큐레이션) */
  route?: Array<{ lat: number; lng: number }> | null;
  basePlace?: MapBasePlace | null;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** false면 항상 개별 핀 표시 (큐레이션 상세 등) */
  clustering?: boolean;
  /** true면 모든 마커가 보이도록 화면 맞춤 */
  fitBounds?: boolean;
  /** compact — 이름만 표시하는 작은 핀 */
  pinVariant?: MapPinVariant;
};

type DistrictCluster = {
  district: string;
  lat: number;
  lng: number;
  count: number;
};

type NaverMarker = {
  setMap: (map: unknown | null) => void;
};

type NaverPolyline = {
  setMap: (map: unknown | null) => void;
};

type NaverMapInstance = {
  setCenter: (center: unknown) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  fitBounds: (bounds: unknown, margin?: number | Record<string, number>) => void;
};

const CLUSTER_MAX_ZOOM = 14;
const DETAIL_MIN_ZOOM = 15;
const OVERVIEW_INITIAL_ZOOM = 12;
const DETAIL_INITIAL_ZOOM = 15;

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: { center: unknown; zoom: number }
        ) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => { extend: (latlng: unknown) => void };
        Marker: new (options: {
          position: unknown;
          map: unknown;
          title?: string;
          icon?: { content: string };
          zIndex?: number;
        }) => NaverMarker;
        Polyline: new (options: {
          map: unknown;
          path: unknown[];
          strokeColor?: string;
          strokeWeight?: number;
          strokeOpacity?: number;
          strokeStyle?: string;
        }) => NaverPolyline;
        Event: {
          addListener: (
            target: unknown,
            event: string,
            handler: () => void
          ) => void;
        };
      };
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function exhibitionToMarker(exhibition: Exhibition, index: number): MapMarker {
  return {
    id: exhibition.id,
    kind: "exhibition",
    lat: exhibition.mapPosition.lat,
    lng: exhibition.mapPosition.lng,
    title: exhibition.venue,
    subtitle: exhibition.title,
    order: index + 1,
    district: exhibition.district
  };
}

function buildDistrictClusters(markers: MapMarker[]): DistrictCluster[] {
  const groups = new Map<string, MapMarker[]>();

  for (const marker of markers) {
    const key = marker.district ?? "기타";
    const list = groups.get(key) ?? [];
    list.push(marker);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).map(([district, items]) => ({
    district,
    lat: items.reduce((sum, item) => sum + item.lat, 0) / items.length,
    lng: items.reduce((sum, item) => sum + item.lng, 0) / items.length,
    count: items.length
  }));
}

function shouldUseClusters(zoom: number, clustering: boolean, markerCount: number) {
  if (!clustering || markerCount <= 4) {
    return false;
  }

  return zoom <= CLUSTER_MAX_ZOOM;
}

function markerContent(marker: MapMarker, options: {
  variant: MapPinVariant;
  selected: boolean;
}): string {
  const title = escapeHtml(marker.title);
  const selectedClass = options.selected ? " is-selected" : "";

  if (options.variant === "compact") {
    const order =
      marker.order != null
        ? `<span class="naver-marker-order">${marker.order}</span>`
        : "";
    return `<div class="naver-marker naver-marker--compact naver-marker--${marker.kind}${selectedClass}">${order}<strong>${title}</strong></div>`;
  }

  const subtitle = marker.subtitle ? escapeHtml(marker.subtitle) : "";
  const badge = marker.badge ? escapeHtml(marker.badge) : "";
  const badgeTone = marker.badgeTone ?? "accent";

  if (marker.kind === "stop") {
    return `<div class="naver-marker naver-marker--stop${selectedClass}"><span>${marker.order ?? ""}</span><strong>${title}</strong>${badge ? `<i class="marker-badge tone-${badgeTone}">${badge}</i>` : ""}</div>`;
  }
  if (marker.kind === "space") {
    return `<div class="naver-marker naver-marker--space${selectedClass}"><span>${marker.order ?? "공간"}</span><strong>${title}</strong>${badge ? `<i class="marker-badge tone-${badgeTone}">${badge}</i>` : ""}</div>`;
  }
  if (marker.kind === "program") {
    return `<div class="naver-marker naver-marker--program${selectedClass}"><span>프로그램</span><strong>${title}</strong>${badge ? `<i class="marker-badge tone-${badgeTone}">${badge}</i>` : ""}</div>`;
  }
  if (marker.kind === "place") {
    return `<div class="naver-marker naver-marker--place${selectedClass}"><span>${marker.order ?? "장소"}</span><strong>${title}</strong></div>`;
  }

  return `<div class="naver-marker naver-marker--exhibition naver-marker--detail${selectedClass}"><span>${marker.order ?? ""}</span><strong>${title}</strong>${subtitle ? `<em>${subtitle}</em>` : ""}</div>`;
}

export function NaverMap({
  exhibitions = [],
  markers,
  route = null,
  basePlace,
  selectedId,
  onSelect,
  clustering = true,
  fitBounds = false,
  pinVariant = "default"
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<NaverMapInstance | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const polylineRef = useRef<NaverPolyline | null>(null);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const pinVariantRef = useRef(pinVariant);
  const renderMarkersRef = useRef<((map: NaverMapInstance) => void) | null>(null);
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const resolvedMarkers: MapMarker[] =
    markers ?? exhibitions.map((exhibition, index) => exhibitionToMarker(exhibition, index));

  const markersKey = JSON.stringify(
    resolvedMarkers.map((marker) => [
      marker.id,
      marker.lat,
      marker.lng,
      marker.order
    ])
  );
  const routeKey = JSON.stringify(route ?? []);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    pinVariantRef.current = pinVariant;
  }, [pinVariant]);

  // markersKey/routeKey는 resolvedMarkers/route의 내용 기반 서명이다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const currentMarkers = resolvedMarkers;

    if (!mapRef.current || !clientId || (currentMarkers.length === 0 && !basePlace)) {
      return;
    }

    const scriptId = "naver-map-sdk";
    const center = basePlace
      ? { lat: basePlace.lat, lng: basePlace.lng }
      : { lat: currentMarkers[0].lat, lng: currentMarkers[0].lng };
    const initialZoom = clustering ? OVERVIEW_INITIAL_ZOOM : DETAIL_INITIAL_ZOOM;

    function clearOverlays() {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    }

    function renderMarkers(map: NaverMapInstance) {
      const naverMaps = window.naver?.maps;

      if (!naverMaps) {
        return;
      }

      clearOverlays();
      const zoom = map.getZoom();
      const activeSelectedId = selectedIdRef.current;
      const useClusters =
        clustering &&
        !activeSelectedId &&
        shouldUseClusters(zoom, clustering, currentMarkers.length);

      if (route && route.length > 1) {
        polylineRef.current = new naverMaps.Polyline({
          map,
          path: route.map((point) => new naverMaps.LatLng(point.lat, point.lng)),
          strokeColor: "#1f6b52",
          strokeWeight: 3,
          strokeOpacity: 0.75,
          strokeStyle: "shortdash"
        });
      }

      if (basePlace) {
        const baseMarker = new naverMaps.Marker({
          position: new naverMaps.LatLng(basePlace.lat, basePlace.lng),
          map,
          title: basePlace.name,
          icon: {
            content: `<div class="naver-marker naver-marker--base naver-marker--compact"><strong>${escapeHtml(basePlace.name)}</strong></div>`
          }
        });
        markersRef.current.push(baseMarker);
      }

      if (useClusters) {
        for (const cluster of buildDistrictClusters(currentMarkers)) {
          const marker = new naverMaps.Marker({
            position: new naverMaps.LatLng(cluster.lat, cluster.lng),
            map,
            title: `${cluster.district} ${cluster.count}개`,
            icon: {
              content: `<div class="naver-marker naver-marker--cluster"><span>${cluster.count}</span><strong>${escapeHtml(cluster.district)}</strong></div>`
            }
          });

          naverMaps.Event.addListener(marker, "click", () => {
            map.setCenter(new naverMaps.LatLng(cluster.lat, cluster.lng));
            map.setZoom(DETAIL_MIN_ZOOM);
          });

          markersRef.current.push(marker);
        }
        return;
      }

      currentMarkers.forEach((item) => {
        const isSelected = item.id === activeSelectedId;
        const marker = new naverMaps.Marker({
          position: new naverMaps.LatLng(item.lat, item.lng),
          map,
          title: item.title,
          icon: {
            content: markerContent(item, {
              variant: pinVariantRef.current,
              selected: isSelected
            })
          },
          zIndex: isSelected ? 100 : item.kind === "space" ? 20 : 10
        });

        naverMaps.Event.addListener(marker, "click", () => {
          onSelectRef.current?.(item.id);
        });

        markersRef.current.push(marker);
      });
    }

    renderMarkersRef.current = renderMarkers;

    function applyBounds(map: NaverMapInstance) {
      const naverMaps = window.naver?.maps;
      if (!naverMaps || !fitBounds || currentMarkers.length < 2) return;

      const bounds = new naverMaps.LatLngBounds();
      currentMarkers.forEach((item) => {
        bounds.extend(new naverMaps.LatLng(item.lat, item.lng));
      });
      if (basePlace) {
        bounds.extend(new naverMaps.LatLng(basePlace.lat, basePlace.lng));
      }
      map.fitBounds(bounds, 48);
    }

    function initMap() {
      if (!mapRef.current || !window.naver?.maps) {
        setMapError("네이버 지도 SDK를 불러오지 못했습니다.");
        return;
      }

      try {
        mapRef.current.innerHTML = "";

        const map = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(center.lat, center.lng),
          zoom: initialZoom
        });

        mapInstanceRef.current = map;
        renderMarkers(map);
        applyBounds(map);

        window.naver.maps.Event.addListener(map, "zoom_changed", () => {
          renderMarkers(map);
        });

        setMapReady(true);
        setMapError(null);
      } catch {
        setMapError("지도 초기화 중 오류가 발생했습니다.");
      }
    }

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.naver?.maps) {
        initMap();
      } else {
        existingScript.addEventListener("load", initMap);
      }

      return () => {
        clearOverlays();
        mapInstanceRef.current = null;
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = initMap;
    script.onerror = () => {
      setMapError(
        "네이버 지도 스크립트 로드 실패. Client ID(ncpKeyId)와 Web Dynamic Map 서비스 URL(http://localhost:3000) 등록을 확인하세요."
      );
    };
    document.head.appendChild(script);

    return () => {
      clearOverlays();
      mapInstanceRef.current = null;
    };
  }, [clientId, markersKey, routeKey, basePlace, clustering, fitBounds, pinVariant]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) {
      return;
    }

    renderMarkersRef.current?.(mapInstanceRef.current);
  }, [selectedId, markersKey, mapReady, pinVariant]);

  useEffect(() => {
    if (!selectedId || !window.naver?.maps || !mapInstanceRef.current) {
      return;
    }

    const marker = resolvedMarkers.find((item) => item.id === selectedId);

    if (!marker) {
      return;
    }

    const map = mapInstanceRef.current;
    map.setCenter(new window.naver.maps.LatLng(marker.lat, marker.lng));

    const targetZoom = Math.max(DETAIL_MIN_ZOOM, map.getZoom());
    if (map.getZoom() < DETAIL_MIN_ZOOM) {
      map.setZoom(DETAIL_MIN_ZOOM);
    } else if (targetZoom < 16 && pinVariant === "compact") {
      map.setZoom(16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, markersKey, mapReady]);

  if (!clientId) {
    return (
      <div className="naver-map-fallback" aria-label="Naver Map 미리보기">
        <div className="map-brand-badge">Naver Map preview</div>
        {basePlace ? (
          <div
            className="map-pin map-pin--base"
            style={{ left: "42%", top: "38%" }}
          >
            <span>거점</span>
            <strong>{basePlace.name}</strong>
          </div>
        ) : null}
        {resolvedMarkers.map((marker, index) => (
          <Link
            key={`pin-${marker.id}`}
            className="map-pin map-pin--exhibition"
            href={marker.kind === "exhibition" ? `/exhibitions/${marker.id}` : "#"}
            style={{
              left: `${20 + ((index * 17) % 60)}%`,
              top: `${30 + ((index * 13) % 40)}%`
            }}
          >
            <span>{marker.order ?? index + 1}</span>
            <strong>{marker.title}</strong>
          </Link>
        ))}
        <div className="map-floating-card">
          <strong>네이버 지도 API 연동 필요</strong>
          <p>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 환경 변수를 설정해주세요.</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="naver-map-fallback naver-map-error" aria-label="Naver Map 오류">
        <div className="map-brand-badge">Naver Map error</div>
        <div className="map-floating-card">
          <strong>지도를 불러오지 못했습니다</strong>
          <p>{mapError}</p>
          <p>
            네이버 클라우드 콘솔에서 <strong>Web Dynamic Map</strong>을 활성화하고, 서비스
            URL에 <code>http://localhost:3000</code>만 등록해보세요. (경로 /map 은 별도
            등록 불필요)
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="naver-map-canvas" aria-label="Naver Map" />;
}
