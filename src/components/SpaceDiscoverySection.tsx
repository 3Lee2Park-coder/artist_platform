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
    if (spaces.length === 0) {
      return { sorted: [], districtLabel: "작가의 공간", nearbyCount: 0 };
    }

    if (sortMode === "nearby" && coords) {
      const withDistance = spaces.map((space) => ({
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
        sorted: sortByVisitAndProgram(spaces),
        districtLabel: "프로그램이 열린 공간",
        nearbyCount: 0
      };
    }

    // 기본: 신당 우선(클러스터 시드) → 없으면 전체 프로그램/방문 가능 순
    const sindang = spaces.filter((space) => space.district.includes("신당"));
    const base = sindang.length >= 2 ? sindang : spaces;
    return {
      sorted: sortByVisitAndProgram(base),
      districtLabel:
        sindang.length >= 2 ? "신당의 공방과 쇼룸" : "공방과 쇼룸 둘러보기",
      nearbyCount: 0
    };
  }, [spaces, coords, sortMode]);

  if (spaces.length === 0) {
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
              ? "현재 위치 기준으로 가까운 공간을 먼저 보여 드립니다."
              : "근처 공간이 적어, 가장 가까운 순으로 보여 드립니다."
            : "프로그램이 열린 공방은 배지로 먼저 확인해 보세요. 위치 권한을 허용하면 가까운 순으로 바뀝니다."
        }
        actionLabel="전체 공간"
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
