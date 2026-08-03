"use client";

import { SpaceCard } from "@/components/SpaceCard";
import type { SpaceSummary } from "@/lib/spaces";
import { useMemo, useState } from "react";

type SpacesDirectoryClientProps = {
  spaces: SpaceSummary[];
};

export function SpacesDirectoryClient({ spaces }: SpacesDirectoryClientProps) {
  const districts = useMemo(
    () => Array.from(new Set(spaces.map((space) => space.district))),
    [spaces]
  );
  const [district, setDistrict] = useState<string>("all");

  const filtered = useMemo(
    () =>
      district === "all"
        ? spaces
        : spaces.filter((space) => space.district === district),
    [spaces, district]
  );

  if (spaces.length === 0) {
    return (
      <div className="empty-state">
        아직 소개 중인 공간이 없습니다. 첫 공간을 준비하고 있어요.
      </div>
    );
  }

  return (
    <>
      <div className="space-directory-chips" role="tablist" aria-label="동네 필터">
        <button
          type="button"
          role="tab"
          aria-selected={district === "all"}
          className={district === "all" ? "taste-chip active" : "taste-chip"}
          onClick={() => setDistrict("all")}
        >
          전체 {spaces.length}
        </button>
        {districts.map((item) => {
          const count = spaces.filter((space) => space.district === item).length;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={district === item}
              className={district === item ? "taste-chip active" : "taste-chip"}
              onClick={() => setDistrict(item)}
            >
              {item} {count}
            </button>
          );
        })}
      </div>

      <section className="space-directory-group" aria-label="작가 공간 목록">
        <h2 className="space-directory-district">
          {district === "all" ? "전체 동네" : district}
          <small>{filtered.length}곳</small>
        </h2>
        <div className="space-grid space-grid--directory">
          {filtered.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      </section>
    </>
  );
}
