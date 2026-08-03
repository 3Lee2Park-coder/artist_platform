"use client";

import {
  NaverMap,
  type MapBasePlace,
  type MapMarker,
  type MapPinVariant
} from "@/components/NaverMap";
import type { CurationStopItem } from "@/lib/exhibitions";
import type { Exhibition } from "@/types/exhibition";

type CurationMapEmbedProps = {
  exhibitions?: Exhibition[];
  /** stop 기반 큐레이션 — 있으면 번호 핀 + 동선으로 표시 */
  stops?: CurationStopItem[];
  basePlace?: MapBasePlace | null;
  compact?: boolean;
  pinVariant?: MapPinVariant;
  selectedId?: string;
  onSelect?: (id: string) => void;
};

export function CurationMapEmbed({
  exhibitions = [],
  stops,
  basePlace = null,
  compact = false,
  pinVariant = "compact",
  selectedId,
  onSelect
}: CurationMapEmbedProps) {
  const hasStops = Boolean(stops && stops.length > 0);

  if (!hasStops && exhibitions.length === 0 && !basePlace) {
    return (
      <div className={`curation-map-embed${compact ? " compact" : ""}`}>
        <div className="curation-map-placeholder">
          <span>표시할 장소가 없습니다</span>
        </div>
      </div>
    );
  }

  const stopMarkers: MapMarker[] | undefined = hasStops
    ? stops!.map((stop) => ({
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
      }))
    : undefined;

  const route = hasStops
    ? stops!.map((stop) => ({ lat: stop.lat, lng: stop.lng }))
    : null;

  return (
    <div className={`curation-map-embed${compact ? " compact" : ""}`}>
      <NaverMap
        exhibitions={hasStops ? undefined : exhibitions}
        markers={stopMarkers}
        route={route}
        basePlace={basePlace}
        clustering={false}
        fitBounds={hasStops}
        pinVariant={pinVariant}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
