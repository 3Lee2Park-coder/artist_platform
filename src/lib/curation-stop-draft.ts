import { distanceMeters, formatWalkDistance } from "@/lib/geo";
import { districtMatchesNeighborhood } from "@/lib/locations";
import type { CurationStopType } from "@/lib/exhibitions";

export type GeoItem = {
  id: string;
  lat: number;
  lng: number;
  district: string;
};

export type CourseStopDraft = {
  key: string;
  stopType: CurationStopType;
  refId: string;
  title: string;
  district: string;
  lat: number;
  lng: number;
  editorialBadge: string;
  distanceText: string;
  note: string;
};

export type StopPoolEntry = GeoItem & {
  title: string;
  subtitle: string;
  stopType: CurationStopType;
  meters: number | null;
};

const PLACE_TYPE_LABEL: Record<string, string> = {
  CAFE: "카페",
  RESTAURANT: "식당",
  WALK: "산책",
  ETC: "가볼 곳"
};

const SPACE_TYPE_LABEL: Record<string, string> = {
  STUDIO: "공방",
  SHOWROOM: "쇼룸",
  RESIDENCY: "레지던시",
  SHARED_SPACE: "공유 공간"
};

export function placeTypeLabel(type: string): string {
  return PLACE_TYPE_LABEL[type] ?? type;
}

export function spaceTypeLabel(type: string): string {
  return SPACE_TYPE_LABEL[type] ?? "공간";
}

export function stopDraftKey(stopType: CurationStopType, refId: string): string {
  return `${stopType}:${refId}`;
}

export function createStopDraft(
  entry: StopPoolEntry,
  anchor: { lat: number; lng: number } | null
): CourseStopDraft {
  const meters =
    anchor != null
      ? distanceMeters(anchor, { lat: entry.lat, lng: entry.lng })
      : null;

  return {
    key: `${entry.stopType}:${entry.id}:${Date.now()}`,
    stopType: entry.stopType,
    refId: entry.id,
    title: entry.title,
    district: entry.district,
    lat: entry.lat,
    lng: entry.lng,
    editorialBadge: "",
    distanceText: meters != null ? formatWalkDistance(meters) : "",
    note: ""
  };
}

export function filterPoolByNeighborhood<T extends GeoItem>(
  items: T[],
  neighborhood: string
): T[] {
  if (!neighborhood.trim()) return items;
  return items.filter((item) => districtMatchesNeighborhood(item.district, neighborhood));
}

export function filterPoolByRadius<T extends GeoItem>(
  items: T[],
  anchor: { lat: number; lng: number } | null,
  radiusMeters: number
): Array<T & { meters: number | null }> {
  return items.map((item) => ({
    ...item,
    meters:
      anchor != null
        ? distanceMeters(anchor, { lat: item.lat, lng: item.lng })
        : null
  })).filter((item) => item.meters == null || item.meters <= radiusMeters);
}

export function resolveRouteAnchor(
  basePlace: { lat: number; lng: number } | null,
  stops: CourseStopDraft[]
): { lat: number; lng: number } | null {
  if (stops.length > 0) {
    const last = stops[stops.length - 1];
    return { lat: last.lat, lng: last.lng };
  }
  return basePlace;
}

export function countStopsByType(stops: CourseStopDraft[]) {
  return {
    space: stops.filter((stop) => stop.stopType === "SPACE").length,
    place: stops.filter((stop) => stop.stopType === "PLACE").length,
    exhibition: stops.filter((stop) => stop.stopType === "EXHIBITION").length
  };
}

export function buildAutoSubtitle(
  neighborhood: string,
  basePlaceName: string | null,
  stops: CourseStopDraft[],
  durationText: string
): string {
  const counts = countStopsByType(stops);
  const parts = [neighborhood.trim() || "동네"];

  if (basePlaceName) {
    parts.push(`${basePlaceName} 거점`);
  }

  const summary: string[] = [];
  if (counts.space > 0) summary.push(`공간 ${counts.space}`);
  if (counts.place > 0) summary.push(`장소 ${counts.place}`);
  if (counts.exhibition > 0) summary.push(`전시 ${counts.exhibition}`);
  if (summary.length > 0) {
    parts.push(summary.join(" · "));
  }

  if (durationText.trim()) {
    parts.push(durationText.trim());
  }

  return parts.join(" · ");
}

export function buildStopSummary(stops: CourseStopDraft[]): string {
  const counts = countStopsByType(stops);
  return formatStopCounts(counts);
}

export function buildStopSummaryFromTypes(
  stops: Array<{ stopType: CurationStopType }>
): string {
  const counts = {
    space: stops.filter((stop) => stop.stopType === "SPACE").length,
    place: stops.filter((stop) => stop.stopType === "PLACE").length,
    exhibition: stops.filter((stop) => stop.stopType === "EXHIBITION").length
  };
  return formatStopCounts(counts);
}

function formatStopCounts(counts: {
  space: number;
  place: number;
  exhibition: number;
}): string {
  const parts: string[] = [];
  if (counts.space > 0) parts.push(`공간 ${counts.space}`);
  if (counts.place > 0) parts.push(`장소 ${counts.place}`);
  if (counts.exhibition > 0) parts.push(`전시 ${counts.exhibition}`);
  return parts.length > 0 ? parts.join(" · ") : "동선 없음";
}

export function stopsToApiPayload(stops: CourseStopDraft[]) {
  return stops.map((stop) => ({
    stopType: stop.stopType,
    refId: stop.refId,
    editorialBadge: stop.editorialBadge.trim() || null,
    distanceText: stop.distanceText.trim() || null,
    note: stop.note.trim() || null
  }));
}
