"use client";

import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { SpaceCard } from "@/components/SpaceCard";
import { distanceMeters } from "@/lib/geo";
import type { SpaceSummary } from "@/lib/spaces";
import { useEffect, useMemo, useState } from "react";

type SpaceDiscoverySectionProps = {
  spaces: SpaceSummary[];
};

type SortMode = "nearby" | "program" | "default";

/** 홈 발견 섹션에만 남길 DEMO 공간 (오픈 스튜디오 — 신당 공방 A) */
const KEEP_DEMO_SPACE_IDS = new Set(["space-sindang-demo-a"]);

function isDemoSpace(space: SpaceSummary) {
  return (
    space.name.includes("DEMO") ||
    space.slug.includes("demo") ||
    space.shortDescription?.includes("DEMO") === true
  );
}

function filterDiscoverySpaces(spaces: SpaceSummary[]) {
  return spaces.filter((space) => {
    if (!isDemoSpace(space)) return true;
    return KEEP_DEMO_SPACE_IDS.has(space.id);
  });
}

const toneOrder: Record<string, number> = {
  ok: 0,
  caution: 1,
  unknown: 2,
  closed: 3
};

function sortByVisitAndProgram(list: SpaceSummary[]) {
  return [...list].sort((a, b) => {
    const programDiff =
      Number(b.activeProgramCount > 0) - Number(a.activeProgramCount > 0);
    if (programDiff !== 0) return programDiff;
    return (
      (toneOrder[a.visitStatus.tone] ?? 9) - (toneOrder[b.visitStatus.tone] ?? 9)
    );
  });
}

export function SpaceDiscoverySection({ spaces }: SpaceDiscoverySectionProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const visibleSpaces = useMemo(() => filterDiscoverySpaces(spaces), [spaces]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setSortMode("nearby");
      },
      () => setGeoDenied(true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

  const { sorted, districtLabel, nearbyCount } = useMemo(() => {
    if (visibleSpaces.length === 0) {
      return { sorted: [], districtLabel: "작가의 공간", nearbyCount: 0 };
    }

    if (sortMode === "nearby" && coords) {
      const withDistance = visibleSpaces.map((space) => ({
        space,
        meters: distanceMeters(coords, { lat: space.lat, lng: space.lng })
      }));
      withDistance.sort((a, b) => a.meters - b.meters);

      // 5km 안이 있으면 그 동네를 강조, 없으면 가까운 순으로만 보여 줌
      const within5km = withDistance.filter((item) => item.meters <= 5000);
      const pool = within5km.length > 0 ? within5km : withDistance;
      const topDistrict = pool[0]?.space.district;
      const sameDistrict = pool.filter(
        (item) => item.space.district === topDistrict
      );
      const ordered =
        sameDistrict.length >= 3
          ? sameDistrict.map((item) => item.space)
          : pool.map((item) => item.space);

      return {
        sorted: ordered,
        districtLabel:
          within5km.length > 0
            ? `${topDistrict ?? "근처"}의 공방과 쇼룸`
            : "가까운 공방과 쇼룸",
        nearbyCount: within5km.length
      };
    }

    if (sortMode === "program") {
      return {
        sorted: sortByVisitAndProgram(visibleSpaces),
        districtLabel: "프로그램이 열린 공간",
        nearbyCount: 0
      };
    }

    // 기본(추천 동네): 중구 공간 우선 → 없으면 신당(중구 하위) → 전체
    const junggu = visibleSpaces.filter(
      (space) =>
        space.district.includes("중구") || space.address?.includes("중구")
    );
    const sindangFallback = visibleSpaces.filter((space) =>
      space.district.includes("신당")
    );
    const base =
      junggu.length >= 1
        ? junggu
        : sindangFallback.length >= 1
          ? sindangFallback
          : visibleSpaces;
    return {
      sorted: sortByVisitAndProgram(base),
      districtLabel:
        junggu.length >= 1
          ? "중구의 공방과 쇼룸"
          : sindangFallback.length >= 1
            ? "중구(신당)의 공방과 쇼룸"
            : "공방과 쇼룸 둘러보기",
      nearbyCount: 0
    };
  }, [visibleSpaces, coords, sortMode]);

  if (visibleSpaces.length === 0) {
    return null;
  }

  return (
    <section className="home-section" aria-labelledby="space-discovery-title">
      <HomeSectionHeader
        eyebrow="작가의 공간"
        title={districtLabel}
        titleId="space-discovery-title"
        description={
          sortMode === "nearby" && coords
            ? nearbyCount > 0
              ? "지금 위치에서 가까운 공간부터 둘러보세요."
              : "근처가 적어, 가장 가까운 순으로 보여 드립니다."
            : "프로그램이 열린 공방은 배지로 먼저 확인하세요. 위치 권한을 켜면 가까운 순으로 바뀝니다."
        }
        actionLabel="공간 전체 보기"
        actionHref="/spaces"
      />

      <div className="space-sort-chips">
        <button
          type="button"
          className={sortMode === "nearby" ? "taste-chip active" : "taste-chip"}
          onClick={() => {
            if (coords) setSortMode("nearby");
            else if (!geoDenied && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  });
                  setSortMode("nearby");
                },
                () => setGeoDenied(true)
              );
            }
          }}
          disabled={geoDenied && !coords}
        >
          가까운 순
        </button>
        <button
          type="button"
          className={sortMode === "program" ? "taste-chip active" : "taste-chip"}
          onClick={() => setSortMode("program")}
        >
          프로그램 우선
        </button>
        <button
          type="button"
          className={sortMode === "default" ? "taste-chip active" : "taste-chip"}
          onClick={() => setSortMode("default")}
        >
          추천 동네
        </button>
      </div>

      <div className="space-card-rail">
        {sorted.slice(0, 8).map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>
    </section>
  );
}
