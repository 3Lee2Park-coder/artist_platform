"use client";

import { ExhibitionCard } from "@/components/ExhibitionCard";
import { NaverMap, type MapMarker } from "@/components/NaverMap";
import { SpaceCard } from "@/components/SpaceCard";
import type { CurationSummary } from "@/lib/exhibitions";
import type { ProgramSummary } from "@/lib/programs";
import type { SpaceSummary } from "@/lib/spaces";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

export function MapPageClient({
  exhibitions,
  spaces,
  programs,
  curations,
  initialLayer,
  initialFocusId
}: MapPageClientProps) {
  const availableLayers = useMemo(() => {
    const layers: MapLayer[] = [];
    if (curations.length > 0) layers.push("curation");
    if (spaces.length > 0) layers.push("space");
    if (exhibitions.length > 0) layers.push("exhibition");
    return layers.length > 0 ? layers : (["exhibition"] as MapLayer[]);
  }, [curations.length, spaces.length, exhibitions.length]);

  const resolvedInitialLayer = useMemo(() => {
    if (initialFocusId) {
      if (exhibitions.some((item) => item.id === initialFocusId)) {
        return "exhibition" as MapLayer;
      }
      if (spaces.some((item) => item.id === initialFocusId)) {
        return "space" as MapLayer;
      }
    }
    if (initialLayer && availableLayers.includes(initialLayer)) {
      return initialLayer;
    }
    return availableLayers[0];
  }, [initialFocusId, exhibitions, spaces, initialLayer, availableLayers]);

  const [layer, setLayer] = useState<MapLayer>(resolvedInitialLayer);
  const [curationIndex, setCurationIndex] = useState(0);
  const [sheetState, setSheetState] = useState<"peek" | "expanded">(
    initialFocusId ? "expanded" : "peek"
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(initialFocusId);
  const listRef = useRef<HTMLDivElement>(null);

  const activeCuration = curations[curationIndex] ?? null;

  const { markers, route, clustering, fitBounds } = useMemo(() => {
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
        order: stop.sortOrder + 1
      }));
      return {
        markers: stopMarkers,
        route: activeCuration.stops.map((stop) => ({
          lat: stop.lat,
          lng: stop.lng
        })),
        clustering: false,
        fitBounds: true
      };
    }

    if (layer === "space") {
      const spaceMarkers: MapMarker[] = spaces.map((space) => ({
        id: space.id,
        kind: "space" as const,
        lat: space.lat,
        lng: space.lng,
        title: space.name,
        district: space.district
      }));
      return { markers: spaceMarkers, route: null, clustering: false, fitBounds: true };
    }

    const exhibitionMarkers: MapMarker[] = exhibitions.map((exhibition) => ({
      id: exhibition.id,
      kind: "exhibition" as const,
      lat: exhibition.mapPosition.lat,
      lng: exhibition.mapPosition.lng,
      title: exhibition.venue,
      district: exhibition.district
    }));
    return {
      markers: exhibitionMarkers,
      route: null,
      clustering: exhibitions.length > 6,
      fitBounds: false
    };
  }, [layer, activeCuration, spaces, exhibitions]);

  const resultCountLabel =
    layer === "curation"
      ? `${activeCuration?.stops.length ?? 0}개의 코스 지점`
      : layer === "space"
        ? `${spaces.length}개의 작가 공간`
        : `${exhibitions.length}개의 전시`;

  function handleSelect(id: string) {
    setSelectedId(id);
    setSheetState("expanded");
  }

  function handleHover(id: string) {
    setSelectedId(id);
  }

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(
      `[data-map-item-id="${selectedId}"]`
    );
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const layerChips = (
    <div className="map-layer-tabs" role="tablist" aria-label="지도 레이어">
      {availableLayers.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={layer === item}
          className={layer === item ? "map-layer-tab active" : "map-layer-tab"}
          onClick={() => {
            setLayer(item);
            setSelectedId(undefined);
          }}
        >
          {LAYER_LABEL[item]}
        </button>
      ))}
    </div>
  );

  const curationChips =
    layer === "curation" && curations.length > 1 ? (
      <div className="map-curation-chips" aria-label="큐레이션 선택">
        {curations.map((curation, index) => (
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

  const panelHeading = (
    <div className="map-panel-heading">
      <p className="eyebrow">지도</p>
      <h1 id="map-title">
        {layer === "curation"
          ? activeCuration?.title ?? "오늘의 큐레이션"
          : layer === "space"
            ? "작가 공간"
            : "전시"}
      </h1>
      <p className="map-panel-lead">
        {layer === "curation"
          ? "번호 순서대로 걸으면 하나의 동선이 완성됩니다."
          : layer === "space"
            ? "공간 이름을 눌러 위치를 확인하세요."
            : "전시 장소를 선택하면 지도가 해당 위치로 이동합니다."}
      </p>
      <p className="map-result-count">{resultCountLabel}</p>
    </div>
  );

  const resultList = (keyPrefix: string) => {
    if (layer === "curation" && activeCuration) {
      return (
        <div className="map-stop-list" ref={keyPrefix === "desktop" ? listRef : undefined}>
          {activeCuration.stops.map((stop) => (
            <div
              key={`${keyPrefix}-${stop.id}`}
              data-map-item-id={stop.id}
              className={
                selectedId === stop.id ? "map-stop-item active" : "map-stop-item"
              }
              onMouseEnter={() => handleHover(stop.id)}
              onFocus={() => handleHover(stop.id)}
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
      return (
        <div
          className="map-result-list"
          ref={keyPrefix === "desktop" ? listRef : undefined}
        >
          {spaces.map((space) => (
            <div
              key={`${keyPrefix}-${space.id}`}
              data-map-item-id={space.id}
              className={selectedId === space.id ? "map-list-item active" : "map-list-item"}
              onMouseEnter={() => handleHover(space.id)}
              onFocus={() => handleHover(space.id)}
            >
              <SpaceCard space={space} compact />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        className="map-result-list"
        ref={keyPrefix === "desktop" ? listRef : undefined}
      >
        {exhibitions.map((exhibition) => (
          <div
            key={`${keyPrefix}-${exhibition.id}`}
            data-map-item-id={exhibition.id}
            className={
              selectedId === exhibition.id ? "map-list-item active" : "map-list-item"
            }
            onMouseEnter={() => handleHover(exhibition.id)}
            onFocus={() => handleHover(exhibition.id)}
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
        <div className="map-layer-overlay map-layer-overlay--panel">{layerChips}</div>
        {panelHeading}
        {curationChips}
        {resultList("desktop")}
      </aside>

      <section className="naver-map-panel map-fullscreen" aria-label="지도">
        <NaverMap
          markers={markers}
          route={route}
          selectedId={selectedId}
          onSelect={handleSelect}
          clustering={clustering}
          fitBounds={fitBounds}
          pinVariant="compact"
        />
        <div className="map-layer-overlay map-layer-overlay--map">
          {layerChips}
          {curationChips}
        </div>
        {layer === "exhibition" && exhibitions.length > 6 ? (
          <p className="map-zoom-hint">항목을 선택하면 해당 위치로 이동합니다</p>
        ) : null}
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
          <p className="eyebrow">지도</p>
          <h1 className="map-sheet-title">
            {layer === "curation"
              ? activeCuration?.title ?? "오늘의 큐레이션"
              : layer === "space"
                ? "작가 공간"
                : "전시"}
          </h1>
        </div>

        <div className="map-sheet-body">
          {layerChips}
          {curationChips}
          {resultList("sheet")}
        </div>
      </aside>
    </section>
  );
}
