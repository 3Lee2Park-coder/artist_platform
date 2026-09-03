"use client";

import { ExhibitionCard } from "@/components/ExhibitionCard";
import {
  NaverMap,
  type MapMarker,
  type MapViewFocus
} from "@/components/NaverMap";
import { SpaceCard } from "@/components/SpaceCard";
import type { CurationSummary } from "@/lib/exhibitions";
import { inferRegionFromText } from "@/lib/locations";
import {
  MAP_REGION_FILTERS,
  isKnownMapRegion,
  mapRegionCenter,
  mapRegionZoom
} from "@/lib/map-regions";
import type { ProgramSummary } from "@/lib/programs";
import type { SpaceSummary } from "@/lib/spaces";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type MapLayer = "curation" | "space" | "exhibition";

type MapPageClientProps = {
  exhibitions: Exhibition[];
  spaces: SpaceSummary[];
  programs: ProgramSummary[];
  curations: CurationSummary[];
  initialLayer?: MapLayer;
  /** 전시/공간 상세에서 넘어올 때 해당 핀을 바로 선택 */
  initialFocusId?: string;
};

const LAYER_LABEL: Record<MapLayer, string> = {
  curation: "큐레이션",
  space: "공간",
  exhibition: "전시"
};

function resolveItemRegion(
  region?: string | null,
  extra?: Array<string | null | undefined>
) {
  const inferred = inferRegionFromText(
    [region, ...(extra ?? [])].filter(Boolean).join(" ")
  );
  if (inferred !== "기타") {
    return inferred;
  }
  const fallback = region?.trim();
  if (fallback && isKnownMapRegion(fallback)) {
    return fallback;
  }
  return fallback || "기타";
}

function curationRegion(curation: CurationSummary) {
  return resolveItemRegion(curation.basePlace?.region, [
    curation.neighborhood,
    curation.stops[0]?.address,
    curation.stops[0]?.district
  ]);
}

export function MapPageClient({
  exhibitions,
  spaces,
  curations,
  initialLayer,
  initialFocusId
}: MapPageClientProps) {
  const router = useRouter();
  const availableLayers = useMemo(() => {
    const layers: MapLayer[] = [];
    if (curations.length > 0) layers.push("curation");
    if (exhibitions.length > 0) layers.push("exhibition");
    if (spaces.length > 0) layers.push("space");
    return layers.length > 0 ? layers : (["exhibition"] as MapLayer[]);
  }, [curations.length, spaces.length, exhibitions.length]);

  const focusedExhibition = useMemo(
    () => exhibitions.find((item) => item.id === initialFocusId),
    [exhibitions, initialFocusId]
  );
  const focusedSpace = useMemo(
    () => spaces.find((item) => item.id === initialFocusId),
    [spaces, initialFocusId]
  );

  const resolvedInitialLayer = useMemo(() => {
    if (focusedExhibition) {
      return "exhibition" as MapLayer;
    }
    if (focusedSpace) {
      return "space" as MapLayer;
    }
    if (initialLayer && availableLayers.includes(initialLayer)) {
      return initialLayer;
    }
    return availableLayers[0];
  }, [focusedExhibition, focusedSpace, initialLayer, availableLayers]);

  const resolvedInitialRegion = useMemo(() => {
    if (focusedExhibition) {
      return resolveItemRegion(focusedExhibition.region, [
        focusedExhibition.address,
        focusedExhibition.district
      ]);
    }
    if (focusedSpace) {
      return resolveItemRegion(focusedSpace.region, [
        focusedSpace.address,
        focusedSpace.district
      ]);
    }
    if (resolvedInitialLayer === "curation") {
      return "서울";
    }
    return "all";
  }, [focusedExhibition, focusedSpace, resolvedInitialLayer]);

  const [layer, setLayer] = useState<MapLayer>(resolvedInitialLayer);
  const [region, setRegion] = useState(resolvedInitialRegion);
  const [curationIndex, setCurationIndex] = useState(0);
  const [sheetState, setSheetState] = useState<"peek" | "expanded">(
    initialFocusId ? "expanded" : "peek"
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(initialFocusId);

  const regionCounts = useMemo(() => {
    const counts = new Map<string, number>();

    if (layer === "curation") {
      for (const curation of curations) {
        const key = curationRegion(curation);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    }

    if (layer === "space") {
      for (const space of spaces) {
        const key = resolveItemRegion(space.region, [space.address, space.district]);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    }

    for (const exhibition of exhibitions) {
      const key = resolveItemRegion(exhibition.region, [
        exhibition.address,
        exhibition.district
      ]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [layer, curations, spaces, exhibitions]);

  const regionFilters = useMemo(() => {
    if (layer === "curation") {
      return MAP_REGION_FILTERS.filter((item) => item.id === "서울");
    }

    const extra = Array.from(regionCounts.keys()).filter(
      (key) => key !== "all" && !MAP_REGION_FILTERS.some((item) => item.id === key)
    );
    return extra.length > 0
      ? [...MAP_REGION_FILTERS, ...extra.map((id) => ({ id, label: id }))]
      : MAP_REGION_FILTERS;
  }, [layer, regionCounts]);

  const filteredCurations = useMemo(() => {
    return curations.filter((item) => curationRegion(item) === "서울");
  }, [curations]);

  const filteredSpaces = useMemo(() => {
    if (region === "all") {
      return spaces;
    }
    return spaces.filter(
      (item) =>
        resolveItemRegion(item.region, [item.address, item.district]) === region
    );
  }, [spaces, region]);

  const filteredExhibitions = useMemo(() => {
    if (region === "all") {
      return exhibitions;
    }
    return exhibitions.filter(
      (item) =>
        resolveItemRegion(item.region, [item.address, item.district]) === region
    );
  }, [exhibitions, region]);

  const activeCuration = filteredCurations[curationIndex] ?? filteredCurations[0] ?? null;

  useEffect(() => {
    if (curationIndex >= filteredCurations.length) {
      setCurationIndex(0);
    }
  }, [curationIndex, filteredCurations.length]);

  const { markers, clustering, fitBounds } = useMemo(() => {
    if (layer === "curation" && activeCuration) {
      const stopMarkers: MapMarker[] = activeCuration.stops.map((stop) => ({
        id: stop.id,
        kind:
          stop.stopType === "SPACE"
            ? ("space" as const)
            : stop.stopType === "PLACE"
              ? ("place" as const)
              : ("exhibition" as const),
        lat: stop.lat,
        lng: stop.lng,
        title: stop.title,
        order: stop.sortOrder + 1,
        district: stop.district ?? undefined,
        region: resolveItemRegion(activeCuration.basePlace?.region, [
          stop.address,
          stop.district
        ])
      }));
      return {
        markers: stopMarkers,
        clustering: false,
        fitBounds: true
      };
    }

    if (layer === "space") {
      const spaceMarkers: MapMarker[] = filteredSpaces.map((space) => ({
        id: space.id,
        kind: "space" as const,
        lat: space.lat,
        lng: space.lng,
        title: space.name,
        district: space.district,
        region: resolveItemRegion(space.region, [space.address, space.district])
      }));
      return {
        markers: spaceMarkers,
        clustering: spaceMarkers.length > 6,
        fitBounds: false
      };
    }

    const exhibitionMarkers: MapMarker[] = filteredExhibitions.map((exhibition) => ({
      id: exhibition.id,
      kind: "exhibition" as const,
      lat: exhibition.mapPosition.lat,
      lng: exhibition.mapPosition.lng,
      title: exhibition.venue,
      district: exhibition.district,
      region: resolveItemRegion(exhibition.region, [
        exhibition.address,
        exhibition.district
      ])
    }));
    return {
      markers: exhibitionMarkers,
      clustering: exhibitionMarkers.length > 6,
      fitBounds: false
    };
  }, [layer, activeCuration, filteredSpaces, filteredExhibitions]);

  const viewFocus = useMemo<MapViewFocus>(
    () => ({
      id: `${layer}:${region}:${activeCuration?.id ?? ""}:${markers.length}`,
      center: mapRegionCenter(region),
      zoom: mapRegionZoom(region),
      fitMarkers:
        layer === "curation" || (region !== "all" && markers.length > 0)
    }),
    [layer, region, activeCuration?.id, markers.length]
  );

  const resultCountLabel =
    layer === "curation"
      ? `${activeCuration?.stops.length ?? 0}개의 지점`
      : layer === "space"
        ? `${filteredSpaces.length}개의 작가 공간`
        : `${filteredExhibitions.length}개의 전시`;

  const regionLabel =
    region === "all"
      ? "전국"
      : regionFilters.find((item) => item.id === region)?.label ?? region;

  function handleSelect(id: string) {
    setSelectedId(id);
    setSheetState("expanded");
  }

  function handleListActivate(id: string, href?: string | null) {
    if (selectedId === id && href) {
      if (href.startsWith("http://") || href.startsWith("https://")) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(href);
      return;
    }
    handleSelect(id);
  }

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const safeId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(selectedId)
        : selectedId;
    const nodes = document.querySelectorAll<HTMLElement>(
      `[data-map-item-id="${safeId}"]`
    );
    nodes.forEach((node) => {
      if (node.offsetParent !== null) {
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }, [selectedId]);

  function handleLayerChange(next: MapLayer) {
    setLayer(next);
    setSelectedId(undefined);
    setCurationIndex(0);
    if (next === "curation") {
      setRegion("서울");
    }
  }

  function handleRegionChange(next: string) {
    setRegion(next);
    setSelectedId(undefined);
    setCurationIndex(0);
  }

  const layerTabs = (
    <div className="map-layer-tabs" role="tablist" aria-label="지도 보기">
      {availableLayers.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={layer === item}
          className={layer === item ? "map-layer-tab active" : "map-layer-tab"}
          onClick={() => handleLayerChange(item)}
        >
          {LAYER_LABEL[item]}
        </button>
      ))}
    </div>
  );

  const regionChips = (
    <div className="map-region-chips" role="listbox" aria-label="지역">
      {regionFilters.map((item) => {
        const count = item.id === "all" ? undefined : (regionCounts.get(item.id) ?? 0);
        const empty = item.id !== "all" && count === 0;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={region === item.id}
            className={[
              "map-region-chip",
              region === item.id ? "active" : "",
              empty ? "is-empty" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={
              typeof count === "number"
                ? `${item.label} ${count}곳`
                : item.label
            }
            onClick={() => handleRegionChange(item.id)}
          >
            {item.label}
            {typeof count === "number" && count > 0 ? (
              <span className="map-region-count">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const curationChips =
    layer === "curation" && filteredCurations.length > 1 ? (
      <div className="map-curation-chips" aria-label="큐레이션 선택">
        {filteredCurations.map((curation, index) => (
          <button
            key={curation.id}
            type="button"
            className={
              index === curationIndex
                ? "map-curation-chip active"
                : "map-curation-chip"
            }
            onClick={() => {
              setCurationIndex(index);
              setSelectedId(undefined);
            }}
          >
            {curation.neighborhood ?? curation.title}
          </button>
        ))}
      </div>
    ) : null;

  const toolbar = (
    <div className="map-map-toolbar">
      {layerTabs}
      {regionChips}
      {curationChips}
    </div>
  );

  const panelHeading = (
    <div className="map-panel-heading">
      <p className="eyebrow">지도 · {regionLabel}</p>
      <h1 id="map-title">
        {layer === "curation"
          ? activeCuration?.title ?? "오늘의 큐레이션"
          : layer === "space"
            ? "작가 공간"
            : "전시"}
      </h1>
      <p className="map-panel-lead">
        {layer === "curation"
          ? "목록을 한 번 누르면 위치를 찾고, 같은 항목을 다시 누르면 상세로 이동합니다."
          : "목록을 한 번 누르면 지도에서 위치를 찾고, 다시 누르면 상세 페이지로 이동합니다."}
      </p>
      <p className="map-result-count">{resultCountLabel}</p>
    </div>
  );

  const emptyCopy =
    layer === "curation"
      ? `${regionLabel}에 표시할 큐레이션이 없습니다.`
      : layer === "space"
        ? `${regionLabel}에 표시할 공간이 없습니다.`
        : `${regionLabel}에 표시할 전시가 없습니다.`;

  const resultList = (keyPrefix: string) => {
    if (layer === "curation" && activeCuration) {
      return (
        <div className="map-stop-list">
          {activeCuration.stops.map((stop) => (
            <div
              key={`${keyPrefix}-${stop.id}`}
              data-map-item-id={stop.id}
              role="button"
              tabIndex={0}
              aria-current={selectedId === stop.id}
              className={
                selectedId === stop.id ? "map-stop-item active" : "map-stop-item"
              }
              onClickCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleListActivate(stop.id, stop.href ?? stop.externalUrl);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleListActivate(stop.id, stop.href ?? stop.externalUrl);
                }
              }}
            >
              <span className="map-stop-order">{stop.sortOrder + 1}</span>
              <div className="map-stop-copy">
                {stop.href ? (
                  <Link href={stop.href} className="map-stop-title">
                    {stop.title}
                  </Link>
                ) : stop.externalUrl ? (
                  <a
                    href={stop.externalUrl}
                    className="map-stop-title"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {stop.title}
                  </a>
                ) : (
                  <span className="map-stop-title">{stop.title}</span>
                )}
              </div>
            </div>
          ))}
          <Link
            href={`/curations/${activeCuration.id}`}
            className="secondary-button map-curation-detail-link"
          >
            큐레이션 자세히 보기
          </Link>
        </div>
      );
    }

    if (layer === "space") {
      if (filteredSpaces.length === 0) {
        return <p className="map-empty">{emptyCopy}</p>;
      }

      return (
        <div className="map-result-list">
          {filteredSpaces.map((space) => (
            <div
              key={`${keyPrefix}-${space.id}`}
              data-map-item-id={space.id}
              role="button"
              tabIndex={0}
              aria-current={selectedId === space.id}
              className={selectedId === space.id ? "map-list-item active" : "map-list-item"}
              onClickCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleListActivate(space.id, `/spaces/${space.slug}`);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleListActivate(space.id, `/spaces/${space.slug}`);
                }
              }}
            >
              <SpaceCard space={space} compact />
            </div>
          ))}
        </div>
      );
    }

    if (filteredExhibitions.length === 0) {
      return <p className="map-empty">{emptyCopy}</p>;
    }

    return (
      <div className="map-result-list">
        {filteredExhibitions.map((exhibition) => (
          <div
            key={`${keyPrefix}-${exhibition.id}`}
            data-map-item-id={exhibition.id}
            role="button"
            tabIndex={0}
            aria-current={selectedId === exhibition.id}
            className={
              selectedId === exhibition.id ? "map-list-item active" : "map-list-item"
            }
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleListActivate(exhibition.id, `/exhibitions/${exhibition.id}`);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleListActivate(exhibition.id, `/exhibitions/${exhibition.id}`);
              }
            }}
          >
            <ExhibitionCard exhibition={exhibition} compact mapCompact />
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="map-shell map-shell-mobile" aria-labelledby="map-title">
      <aside className="map-side-panel map-desktop-panel" aria-label="지도 리스트">
        {panelHeading}
        {resultList("desktop")}
      </aside>

      <section className="naver-map-panel map-fullscreen" aria-label="지도">
        <NaverMap
          markers={markers}
          selectedId={selectedId}
          onSelect={handleSelect}
          clustering={clustering}
          fitBounds={fitBounds}
          pinVariant="compact"
          viewFocus={viewFocus}
        />
        <div className="map-layer-overlay map-layer-overlay--map">{toolbar}</div>
        <p className="map-zoom-hint">
          {region === "all"
            ? "지역을 고르거나 묶음을 누르면 해당 위치로 확대됩니다"
            : "목록을 한 번 누르면 위치를 찾고, 다시 누르면 상세로 이동합니다"}
        </p>
      </section>

      <aside
        className={
          sheetState === "expanded"
            ? "map-bottom-sheet expanded"
            : "map-bottom-sheet peek"
        }
        aria-label="지도 리스트"
      >
        <button
          type="button"
          className="map-sheet-handle"
          onClick={() =>
            setSheetState((prev) => (prev === "peek" ? "expanded" : "peek"))
          }
          aria-expanded={sheetState === "expanded"}
        >
          <span className="map-sheet-grabber" aria-hidden="true" />
          <strong>{resultCountLabel}</strong>
          <span className="map-sheet-hint">
            {sheetState === "peek" ? "탭하여 리스트 보기" : "탭하여 접기"}
          </span>
        </button>

        <div className="map-panel-heading map-sheet-heading">
          <p className="eyebrow">지도 · {regionLabel}</p>
          <h1 className="map-sheet-title">
            {layer === "curation"
              ? activeCuration?.title ?? "오늘의 큐레이션"
              : layer === "space"
                ? "작가 공간"
                : "전시"}
          </h1>
        </div>

        <div className="map-sheet-body">{resultList("sheet")}</div>
      </aside>
    </section>
  );
}
