"use client";

import { CURATION_STOP_TYPE_LABEL } from "@/lib/exhibitions";
import {
  createStopDraft,
  filterPoolByNeighborhood,
  filterPoolByRadius,
  placeTypeLabel,
  resolveRouteAnchor,
  spaceTypeLabel,
  stopDraftKey,
  type CourseStopDraft,
  type StopPoolEntry
} from "@/lib/curation-stop-draft";
import { formatWalkDistance } from "@/lib/geo";
import { useMemo, useState } from "react";

type BasePlaceOption = {
  id: string;
  name: string;
  type: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
};

type SpaceOption = {
  id: string;
  name: string;
  type: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  visitPolicy: string;
};

type PlaceOption = BasePlaceOption;

type ExhibitionOption = {
  id: string;
  title: string;
  district: string;
  lat: number;
  lng: number;
};

type CurationCourseBuilderProps = {
  neighborhood: string;
  basePlace: BasePlaceOption | null;
  radiusMeters: number;
  spaces: SpaceOption[];
  places: PlaceOption[];
  exhibitions: ExhibitionOption[];
  stops: CourseStopDraft[];
  onChange: (stops: CourseStopDraft[]) => void;
};

type PoolTab = "SPACE" | "PLACE" | "EXHIBITION";

const VISIT_POLICY_LABEL: Record<string, string> = {
  WALK_IN: "워크인",
  HOURS: "운영시간",
  APPOINTMENT: "예약",
  PROGRAM_ONLY: "프로그램만",
  CLOSED: "휴무"
};

export function CurationCourseBuilder({
  neighborhood,
  basePlace,
  radiusMeters,
  spaces,
  places,
  exhibitions,
  stops,
  onChange
}: CurationCourseBuilderProps) {
  const [poolTab, setPoolTab] = useState<PoolTab>("SPACE");
  const [search, setSearch] = useState("");
  const [radiusOnly, setRadiusOnly] = useState(true);

  const addedKeys = useMemo(
    () => new Set(stops.map((stop) => stopDraftKey(stop.stopType, stop.refId))),
    [stops]
  );

  const anchor = resolveRouteAnchor(basePlace, stops.slice(0, -1));

  const spacePool = useMemo(() => {
    const filtered = filterPoolByNeighborhood(spaces, neighborhood);
    const withRadius =
      radiusOnly && basePlace
        ? filterPoolByRadius(filtered, basePlace, radiusMeters)
        : filtered.map((item) => ({ ...item, meters: null as number | null }));

    return withRadius
      .map(
        (space): StopPoolEntry => ({
          id: space.id,
          lat: space.lat,
          lng: space.lng,
          district: space.district,
          meters: space.meters,
          title: space.name,
          subtitle: `${spaceTypeLabel(space.type)} · ${space.district} · ${VISIT_POLICY_LABEL[space.visitPolicy] ?? space.visitPolicy}`,
          stopType: "SPACE"
        })
      )
      .sort((a, b) => (a.meters ?? 99999) - (b.meters ?? 99999));
  }, [spaces, neighborhood, radiusOnly, basePlace, radiusMeters]);

  const placePool = useMemo(() => {
    const active = places.filter((place) => place.id !== basePlace?.id);
    const filtered = filterPoolByNeighborhood(active, neighborhood);
    const withRadius = radiusOnly && basePlace
      ? filterPoolByRadius(filtered, basePlace, radiusMeters)
      : filtered.map((item) => ({ ...item, meters: null as number | null }));

    return withRadius
      .map(
        (place): StopPoolEntry => ({
          id: place.id,
          lat: place.lat,
          lng: place.lng,
          district: place.district,
          meters: place.meters,
          title: place.name,
          subtitle: `${placeTypeLabel(place.type)} · ${place.district}`,
          stopType: "PLACE"
        })
      )
      .sort((a, b) => (a.meters ?? 99999) - (b.meters ?? 99999));
  }, [places, neighborhood, radiusOnly, basePlace, radiusMeters]);

  const exhibitionPool = useMemo(() => {
    const filtered = filterPoolByNeighborhood(exhibitions, neighborhood);
    const withRadius = radiusOnly && basePlace
      ? filterPoolByRadius(filtered, basePlace, radiusMeters)
      : filtered.map((item) => ({ ...item, meters: null as number | null }));

    return withRadius
      .map(
        (exhibition): StopPoolEntry => ({
          id: exhibition.id,
          lat: exhibition.lat,
          lng: exhibition.lng,
          district: exhibition.district,
          meters: exhibition.meters,
          title: exhibition.title,
          subtitle: exhibition.district,
          stopType: "EXHIBITION"
        })
      )
      .sort((a, b) => (a.meters ?? 99999) - (b.meters ?? 99999));
  }, [exhibitions, neighborhood, radiusOnly, basePlace, radiusMeters]);

  const activePool =
    poolTab === "SPACE" ? spacePool : poolTab === "PLACE" ? placePool : exhibitionPool;

  const filteredPool = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activePool;
    return activePool.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.subtitle.toLowerCase().includes(query) ||
        entry.district.toLowerCase().includes(query)
    );
  }, [activePool, search]);

  function addStop(entry: StopPoolEntry) {
    const key = stopDraftKey(entry.stopType, entry.id);
    if (addedKeys.has(key)) return;
    onChange([...stops, createStopDraft(entry, anchor)]);
  }

  function addBasePlaceToRoute() {
    if (!basePlace || addedKeys.has(stopDraftKey("PLACE", basePlace.id))) return;
    addStop({
      id: basePlace.id,
      lat: basePlace.lat,
      lng: basePlace.lng,
      district: basePlace.district,
      meters: 0,
      title: basePlace.name,
      subtitle: `${placeTypeLabel(basePlace.type)} · 거점`,
      stopType: "PLACE"
    });
  }

  function removeStop(key: string) {
    onChange(stops.filter((stop) => stop.key !== key));
  }

  function moveStop(key: string, direction: -1 | 1) {
    const index = stops.findIndex((stop) => stop.key === key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= stops.length) return;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function updateStop(key: string, patch: Partial<CourseStopDraft>) {
    onChange(stops.map((stop) => (stop.key === key ? { ...stop, ...patch } : stop)));
  }

  const poolTabLabel: Record<PoolTab, string> = {
    SPACE: "공간 (공방·쇼룸)",
    PLACE: "장소 (카페·식당)",
    EXHIBITION: "전시"
  };

  return (
    <div className="course-builder">
      <div className="course-builder-header">
        <div>
          <p className="field-label">동선 지점 ({stops.length}곳)</p>
          <p className="field-hint">
            방문 순서대로 공간·장소·전시를 추가하세요. 지도와 상세 페이지에 이 순서로
            표시됩니다. 시작 거점은 아래와 별도로 두어도 되고, 동선 1번에 넣어도 됩니다.
          </p>
        </div>
        {basePlace ? (
          <button
            type="button"
            className="secondary-button"
            onClick={addBasePlaceToRoute}
            disabled={addedKeys.has(stopDraftKey("PLACE", basePlace.id))}
          >
            거점을 동선에 추가
          </button>
        ) : null}
      </div>

      {stops.length > 0 ? (
        <ol className="course-stop-list">
          {stops.map((stop, index) => (
            <li key={stop.key} className="course-stop-item">
              <div className="course-stop-item-head">
                <span className="course-stop-order">{index + 1}</span>
                <div className="course-stop-title-wrap">
                  <strong>{stop.title}</strong>
                  <span className="course-stop-meta">
                    {CURATION_STOP_TYPE_LABEL[stop.stopType]} · {stop.district}
                    {stop.distanceText ? ` · ${stop.distanceText}` : ""}
                  </span>
                </div>
                <div className="course-stop-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="위로"
                    disabled={index === 0}
                    onClick={() => moveStop(stop.key, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="아래로"
                    disabled={index === stops.length - 1}
                    onClick={() => moveStop(stop.key, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-button warn-button"
                    aria-label="삭제"
                    onClick={() => removeStop(stop.key)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="course-stop-fields">
                <input
                  className="admin-badge-input"
                  placeholder="배지 (예: 오늘 열려 있음)"
                  value={stop.editorialBadge}
                  onChange={(event) =>
                    updateStop(stop.key, { editorialBadge: event.target.value })
                  }
                />
                <input
                  className="admin-badge-input"
                  placeholder="거리 (예: 도보 3분)"
                  value={stop.distanceText}
                  onChange={(event) =>
                    updateStop(stop.key, { distanceText: event.target.value })
                  }
                />
                <input
                  className="admin-badge-input course-stop-note"
                  placeholder="한 줄 메모 (선택)"
                  value={stop.note}
                  onChange={(event) => updateStop(stop.key, { note: event.target.value })}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="course-stop-empty">
          아직 동선이 비어 있습니다. 아래에서 공간·장소·전시를 추가해 주세요.
        </div>
      )}

      <div className="course-pool-toolbar">
        <div className="course-pool-tabs">
          {(Object.keys(poolTabLabel) as PoolTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={poolTab === tab ? "taste-chip active" : "taste-chip"}
              onClick={() => setPoolTab(tab)}
            >
              {poolTabLabel[tab]}
            </button>
          ))}
        </div>
        <input
          className="course-pool-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="이름·동네 검색"
        />
        {basePlace ? (
          <label className="course-pool-filter">
            <input
              type="checkbox"
              checked={radiusOnly}
              onChange={(event) => setRadiusOnly(event.target.checked)}
            />
            거점 반경 {radiusMeters}m 안만
          </label>
        ) : null}
      </div>

      <p className="field-hint">
        {poolTabLabel[poolTab]} · 후보 {filteredPool.length}곳
        {basePlace && radiusOnly ? ` (거점 ${basePlace.name} 기준)` : ""}
      </p>

      <div className="course-pool-list">
        {filteredPool.length > 0 ? (
          filteredPool.map((entry) => {
            const key = stopDraftKey(entry.stopType, entry.id);
            const added = addedKeys.has(key);

            return (
              <div key={key} className="course-pool-row">
                <div className="course-pool-row-text">
                  <strong>{entry.title}</strong>
                  <span>
                    {entry.subtitle}
                    {entry.meters != null ? ` · ${formatWalkDistance(entry.meters)}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className={added ? "secondary-button" : "primary-button"}
                  disabled={added}
                  onClick={() => addStop(entry)}
                >
                  {added ? "추가됨" : "동선에 추가"}
                </button>
              </div>
            );
          })
        ) : (
          <div className="course-stop-empty">
            {poolTab === "SPACE"
              ? "이 동네에 등록된 공개 공간이 없습니다. 공간·프로그램 검수 탭에서 먼저 공개해 주세요."
              : poolTab === "PLACE"
                ? "Place Pool에 장소를 추가하거나, 반경 필터를 끄면 더 많은 후보가 보입니다."
                : "반경 안 전시가 없습니다. 거점·반경을 조정하거나 필터를 끄세요."}
          </div>
        )}
      </div>
    </div>
  );
}
