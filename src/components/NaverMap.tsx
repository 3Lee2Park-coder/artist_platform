"use client";

import { KOREA_MAP_CENTER, KOREA_MAP_ZOOM } from "@/lib/map-regions";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MapBasePlace = {
  name: string;
  lat: number;
  lng: number;
};

export type MapMarkerKind = "space" | "exhibition" | "program" | "place" | "stop";

export type MapMarker = {
  id: string;
  kind: MapMarkerKind;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "ok" | "caution" | "closed" | "unknown" | "accent";
  order?: number;
  district?: string;
  region?: string;
};

export type MapPinVariant = "default" | "compact";

export type MapViewFocus = {
  id: string;
  center: { lat: number; lng: number };
  zoom: number;
  fitMarkers?: boolean;
};

type NaverMapProps = {
  exhibitions?: Exhibition[];
  markers?: MapMarker[];
  route?: Array<{ lat: number; lng: number }> | null;
  basePlace?: MapBasePlace | null;
  selectedId?: string;
  onSelect?: (id: string) => void;
  clustering?: boolean;
  fitBounds?: boolean;
  pinVariant?: MapPinVariant;
  viewFocus?: MapViewFocus | null;
};

type MapCluster = {
  label: string;
  lat: number;
  lng: number;
  count: number;
  mode: "region" | "district";
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

type NaverMapsApi = NonNullable<Window["naver"]>["maps"];

const REGION_CLUSTER_MAX_ZOOM = 10;
const DISTRICT_CLUSTER_MAX_ZOOM = 13;
const DETAIL_MIN_ZOOM = 14;
const REGION_CLUSTER_ZOOM = 11;
const DISTRICT_CLUSTER_ZOOM = 14;

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
        Point: new (x: number, y: number) => unknown;
        Marker: new (options: {
          position: unknown;
          map: unknown;
          title?: string;
          icon?: { content: string; anchor?: unknown };
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

function shortLabel(value: string, max = 8) {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
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
    district: exhibition.district,
    region: exhibition.region
  };
}

function locationKey(marker: MapMarker) {
  return `${marker.lat.toFixed(5)},${marker.lng.toFixed(5)}`;
}

function buildClusters(
  markers: MapMarker[],
  mode: "region" | "district"
): MapCluster[] {
  const groups = new Map<string, MapMarker[]>();

  for (const marker of markers) {
    const key =
      mode === "region"
        ? marker.region?.trim() || "기타"
        : marker.district?.trim() || marker.region?.trim() || "기타";
    const list = groups.get(key) ?? [];
    list.push(marker);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    lat: items.reduce((sum, item) => sum + item.lat, 0) / items.length,
    lng: items.reduce((sum, item) => sum + item.lng, 0) / items.length,
    count: items.length,
    mode
  }));
}

function resolveClusterMode(
  zoom: number,
  clustering: boolean,
  markers: MapMarker[]
): "none" | "region" | "district" {
  if (!clustering || markers.length <= 4) {
    return "none";
  }

  const regions = new Set(
    markers.map((marker) => marker.region?.trim() || "기타")
  );

  if (regions.size > 1 && zoom <= REGION_CLUSTER_MAX_ZOOM) {
    return "region";
  }

  if (zoom <= DISTRICT_CLUSTER_MAX_ZOOM) {
    return "district";
  }

  return "none";
}

function pinAnchor(naverMaps: NaverMapsApi, marker: MapMarker) {
  if (!naverMaps.Point) {
    return undefined;
  }

  if (marker.order != null) {
    return new naverMaps.Point(21, 21);
  }

  return new naverMaps.Point(17, 17);
}

function clusterAnchor(naverMaps: NaverMapsApi) {
  if (!naverMaps.Point) {
    return undefined;
  }

  return new naverMaps.Point(18, 18);
}

function compactPinContent(
  marker: MapMarker,
  options: { selected: boolean; count?: number }
): string {
  const selectedClass = options.selected ? " is-selected" : "";
  const count = options.count && options.count > 1 ? options.count : 0;
  const order =
    marker.order != null
      ? `<span class="naver-pin-dot naver-pin-dot--num">${marker.order}</span>`
      : `<span class="naver-pin-dot">${count ? `<i>${count}</i>` : ""}</span>`;
  const label = options.selected
    ? `<strong class="naver-pin-label">${escapeHtml(marker.title)}</strong>`
    : "";

  return `<div class="naver-pin naver-pin--${marker.kind}${selectedClass}">${order}${label}</div>`;
}

function markerContent(
  marker: MapMarker,
  options: {
    variant: MapPinVariant;
    selected: boolean;
    count?: number;
  }
): string {
  if (options.variant === "compact") {
    return compactPinContent(marker, options);
  }

  const title = escapeHtml(marker.title);
  const selectedClass = options.selected ? " is-selected" : "";
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

function clusterContent(cluster: MapCluster): string {
  return `<div class="naver-marker naver-marker--cluster naver-marker--cluster-${cluster.mode}"><span>${cluster.count}</span><strong>${escapeHtml(shortLabel(cluster.label))}</strong></div>`;
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
  pinVariant = "default",
  viewFocus = null
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<NaverMapInstance | null>(null);
  const overlaysRef = useRef<NaverMarker[]>([]);
  const polylineRef = useRef<NaverPolyline | null>(null);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const pinVariantRef = useRef(pinVariant);
  const clusteringRef = useRef(clustering);
  const fitBoundsRef = useRef(fitBounds);
  const viewFocusRef = useRef(viewFocus);
  const routeRef = useRef(route);
  const basePlaceRef = useRef(basePlace);
  const markersDataRef = useRef<MapMarker[]>([]);
  const drawRef = useRef<(map: NaverMapInstance) => void>(() => undefined);
  const cameraRef = useRef<(map: NaverMapInstance) => void>(() => undefined);
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const resolvedMarkers: MapMarker[] =
    markers ?? exhibitions.map((exhibition, index) => exhibitionToMarker(exhibition, index));

  markersDataRef.current = resolvedMarkers;
  onSelectRef.current = onSelect;
  selectedIdRef.current = selectedId;
  pinVariantRef.current = pinVariant;
  clusteringRef.current = clustering;
  fitBoundsRef.current = fitBounds;
  viewFocusRef.current = viewFocus;
  routeRef.current = route;
  basePlaceRef.current = basePlace;

  const markersKey = JSON.stringify(
    resolvedMarkers.map((marker) => [
      marker.id,
      marker.lat,
      marker.lng,
      marker.order,
      marker.region,
      marker.district
    ])
  );
  const routeKey = JSON.stringify(route ?? []);
  const viewFocusId = viewFocus?.id ?? "";

  useEffect(() => {
    function clearOverlays() {
      overlaysRef.current.forEach((marker) => marker.setMap(null));
      overlaysRef.current = [];
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    }

    function renderMarkers(map: NaverMapInstance) {
      const naverMaps = window.naver?.maps;
      if (!naverMaps) {
        return;
      }

      const currentMarkers = markersDataRef.current;
      const currentRoute = routeRef.current;
      const currentBase = basePlaceRef.current;
      const zoom = map.getZoom();
      const activeSelectedId = selectedIdRef.current;
      const clusterMode = resolveClusterMode(
        zoom,
        clusteringRef.current,
        currentMarkers
      );

      clearOverlays();

      if (currentRoute && currentRoute.length > 1) {
        polylineRef.current = new naverMaps.Polyline({
          map,
          path: currentRoute.map(
            (point) => new naverMaps.LatLng(point.lat, point.lng)
          ),
          strokeColor: "#1f6b52",
          strokeWeight: 3,
          strokeOpacity: 0.75,
          strokeStyle: "shortdash"
        });
      }

      if (currentBase) {
        const baseMarker = new naverMaps.Marker({
          position: new naverMaps.LatLng(currentBase.lat, currentBase.lng),
          map,
          title: currentBase.name,
          icon: {
            content: `<div class="naver-pin naver-pin--base is-selected"><span class="naver-pin-dot"></span><strong class="naver-pin-label">${escapeHtml(currentBase.name)}</strong></div>`,
            anchor: naverMaps.Point ? new naverMaps.Point(17, 17) : undefined
          },
          zIndex: 5
        });
        overlaysRef.current.push(baseMarker);
      }

      if (clusterMode !== "none") {
        for (const cluster of buildClusters(currentMarkers, clusterMode)) {
          const marker = new naverMaps.Marker({
            position: new naverMaps.LatLng(cluster.lat, cluster.lng),
            map,
            title: `${cluster.label} ${cluster.count}개`,
            icon: {
              content: clusterContent(cluster),
              anchor: clusterAnchor(naverMaps)
            },
            zIndex: 30
          });

          naverMaps.Event.addListener(marker, "click", () => {
            map.setCenter(new naverMaps.LatLng(cluster.lat, cluster.lng));
            map.setZoom(
              cluster.mode === "region"
                ? REGION_CLUSTER_ZOOM
                : DISTRICT_CLUSTER_ZOOM
            );
          });

          overlaysRef.current.push(marker);
        }

        const selectedMarker = activeSelectedId
          ? currentMarkers.find((item) => item.id === activeSelectedId)
          : undefined;
        if (selectedMarker) {
          const selected = new naverMaps.Marker({
            position: new naverMaps.LatLng(selectedMarker.lat, selectedMarker.lng),
            map,
            title: selectedMarker.title,
            icon: {
              content: markerContent(selectedMarker, {
                variant: pinVariantRef.current,
                selected: true
              }),
              anchor:
                pinVariantRef.current === "compact"
                  ? pinAnchor(naverMaps, selectedMarker)
                  : undefined
            },
            zIndex: 120
          });
          naverMaps.Event.addListener(selected, "click", () => {
            onSelectRef.current?.(selectedMarker.id);
          });
          overlaysRef.current.push(selected);
        }
        return;
      }

      const grouped = new Map<string, MapMarker[]>();
      for (const item of currentMarkers) {
        const key = locationKey(item);
        const list = grouped.get(key) ?? [];
        list.push(item);
        grouped.set(key, list);
      }

      grouped.forEach((group) => {
        const selectedInGroup = group.find((item) => item.id === activeSelectedId);
        const display = selectedInGroup ?? group[0];
        const isSelected = Boolean(selectedInGroup);
        const marker = new naverMaps.Marker({
          position: new naverMaps.LatLng(display.lat, display.lng),
          map,
          title: display.title,
          icon: {
            content: markerContent(display, {
              variant: pinVariantRef.current,
              selected: isSelected,
              count: group.length
            }),
            anchor:
              pinVariantRef.current === "compact"
                ? pinAnchor(naverMaps, display)
                : undefined
          },
          zIndex: isSelected ? 120 : display.kind === "space" ? 20 : 10
        });

        naverMaps.Event.addListener(marker, "click", () => {
          const currentId = selectedIdRef.current;
          const currentIndex = group.findIndex((item) => item.id === currentId);
          if (currentIndex >= 0 && group.length > 1) {
            onSelectRef.current?.(group[(currentIndex + 1) % group.length].id);
            return;
          }
          onSelectRef.current?.(display.id);
        });

        overlaysRef.current.push(marker);
      });
    }

    function applyCamera(map: NaverMapInstance) {
      const naverMaps = window.naver?.maps;
      if (!naverMaps) {
        return;
      }

      const currentMarkers = markersDataRef.current;
      const activeSelectedId = selectedIdRef.current;
      const focus = viewFocusRef.current;

      if (activeSelectedId) {
        const marker = currentMarkers.find((item) => item.id === activeSelectedId);
        if (marker) {
          map.setCenter(new naverMaps.LatLng(marker.lat, marker.lng));
          if (map.getZoom() < DETAIL_MIN_ZOOM) {
            map.setZoom(DETAIL_MIN_ZOOM);
          }
          return;
        }
      }

      if (focus?.fitMarkers && currentMarkers.length > 0) {
        if (currentMarkers.length === 1) {
          map.setCenter(
            new naverMaps.LatLng(currentMarkers[0].lat, currentMarkers[0].lng)
          );
          map.setZoom(focus.zoom || 14);
          return;
        }

        const bounds = new naverMaps.LatLngBounds();
        currentMarkers.forEach((item) => {
          bounds.extend(new naverMaps.LatLng(item.lat, item.lng));
        });
        const currentBase = basePlaceRef.current;
        if (currentBase) {
          bounds.extend(new naverMaps.LatLng(currentBase.lat, currentBase.lng));
        }
        map.fitBounds(bounds, { top: 88, right: 36, bottom: 48, left: 36 });
        return;
      }

      if (focus) {
        map.setCenter(new naverMaps.LatLng(focus.center.lat, focus.center.lng));
        map.setZoom(focus.zoom);
        return;
      }

      if (fitBoundsRef.current && currentMarkers.length >= 2) {
        const bounds = new naverMaps.LatLngBounds();
        currentMarkers.forEach((item) => {
          bounds.extend(new naverMaps.LatLng(item.lat, item.lng));
        });
        map.fitBounds(bounds, 48);
      }
    }

    drawRef.current = renderMarkers;
    cameraRef.current = applyCamera;

    if (!mapRef.current || !clientId) {
      return;
    }

    const scriptId = "naver-map-sdk";
    const initialFocus = viewFocusRef.current;
    const initialSelected = selectedIdRef.current
      ? markersDataRef.current.find((item) => item.id === selectedIdRef.current)
      : undefined;
    const firstMarker = markersDataRef.current[0];
    const center = initialSelected
      ? { lat: initialSelected.lat, lng: initialSelected.lng }
      : initialFocus?.center ??
        (basePlaceRef.current
          ? { lat: basePlaceRef.current.lat, lng: basePlaceRef.current.lng }
          : firstMarker
            ? { lat: firstMarker.lat, lng: firstMarker.lng }
            : KOREA_MAP_CENTER);
    const initialZoom = initialSelected
      ? DETAIL_MIN_ZOOM
      : (initialFocus?.zoom ?? (clusteringRef.current ? KOREA_MAP_ZOOM : 15));

    function initMap() {
      if (!mapRef.current || !window.naver?.maps) {
        setMapError("네이버 지도 SDK를 불러오지 못했습니다.");
        return;
      }

      if (mapInstanceRef.current) {
        renderMarkers(mapInstanceRef.current);
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
        applyCamera(map);

        window.naver.maps.Event.addListener(map, "zoom_changed", () => {
          renderMarkers(map);
        });

        setMapReady(true);
        setMapError(null);
      } catch {
        setMapError("지도 초기화 중 오류가 발생했습니다.");
      }
    }

    const existingScript = document.getElementById(
      scriptId
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.naver?.maps) {
        initMap();
      } else {
        existingScript.addEventListener("load", initMap);
      }

      return () => {
        clearOverlays();
        mapInstanceRef.current = null;
        setMapReady(false);
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
      setMapReady(false);
    };
  }, [clientId]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) {
      return;
    }

    drawRef.current(mapInstanceRef.current);
  }, [markersKey, routeKey, selectedId, clustering, pinVariant, mapReady, basePlace]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) {
      return;
    }

    cameraRef.current(mapInstanceRef.current);
  }, [selectedId, viewFocusId, mapReady, markersKey]);

  if (!clientId) {
    return (
      <div className="naver-map-fallback" aria-label="Naver Map 미리보기">
        <div className="map-brand-badge">Naver Map preview</div>
        {basePlace ? (
          <div className="map-pin map-pin--base" style={{ left: "42%", top: "38%" }}>
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
