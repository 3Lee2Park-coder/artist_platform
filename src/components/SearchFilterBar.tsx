"use client";

import { REGION_GROUPS } from "@/lib/locations";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const DATE_OPTIONS = [
  { value: "today", label: "오늘" },
  { value: "this_week", label: "이번주" },
  { value: "all", label: "전체" }
] as const;

const CATEGORY_OPTIONS = ["회화", "사진", "조각", "복합"];
const CURATION_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "curation", label: "큐레이션" },
  { value: "reservable", label: "예약가능" }
] as const;

function splitParam(value: string | null) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

export function SearchFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openPanel, setOpenPanel] = useState<"date" | "district" | "curation" | null>(
    null
  );
  const [date, setDate] = useState(searchParams.get("date") ?? "all");
  const [regions, setRegions] = useState<string[]>(() =>
    splitParam(searchParams.get("regions"))
  );
  const [districts, setDistricts] = useState<string[]>(() =>
    splitParam(searchParams.get("districts"))
  );
  const [categories, setCategories] = useState<string[]>(() =>
    splitParam(searchParams.get("categories"))
  );
  const [curation, setCuration] = useState(searchParams.get("curation") ?? "all");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setDate(searchParams.get("date") ?? "all");
    setRegions(splitParam(searchParams.get("regions")));
    setDistricts(splitParam(searchParams.get("districts")));
    setCategories(splitParam(searchParams.get("categories")));
    setCuration(searchParams.get("curation") ?? "all");
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  function toggleRegion(region: string) {
    setRegions((prev) =>
      prev.includes(region)
        ? prev.filter((item) => item !== region)
        : [...prev, region]
    );
  }

  function toggleDistrict(district: string) {
    setDistricts((prev) =>
      prev.includes(district)
        ? prev.filter((item) => item !== district)
        : [...prev, district]
    );
  }

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  }

  function buildSearchUrl() {
    const params = new URLSearchParams();

    if (date !== "all") params.set("date", date);
    if (regions.length > 0) params.set("regions", regions.join(","));
    if (districts.length > 0) params.set("districts", districts.join(","));
    if (categories.length > 0) params.set("categories", categories.join(","));
    if (curation !== "all") params.set("curation", curation);
    if (query.trim()) params.set("q", query.trim());

    const queryString = params.toString();
    return queryString ? `/exhibitions?${queryString}` : "/exhibitions";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildSearchUrl());
    setOpenPanel(null);
  }

  const dateLabel =
    DATE_OPTIONS.find((option) => option.value === date)?.label ?? "전체";
  const districtLabel =
    districts.length > 0
      ? districts.join(" · ")
      : regions.length > 0
        ? regions.join(" · ")
        : "전국";
  const curationLabel =
    CURATION_OPTIONS.find((option) => option.value === curation)?.label ?? "전체";

  return (
    <form className="filter-search" aria-label="전시 검색 필터" onSubmit={handleSubmit}>
      <button
        type="button"
        className="filter-search-item"
        onClick={() => setOpenPanel(openPanel === "date" ? null : "date")}
      >
        <span>날짜</span>
        <strong>{dateLabel}</strong>
      </button>
      <button
        type="button"
        className="filter-search-item"
        onClick={() => setOpenPanel(openPanel === "district" ? null : "district")}
      >
        <span>장소</span>
        <strong>{districtLabel}</strong>
      </button>
      <button
        type="button"
        className="filter-search-item"
        onClick={() => setOpenPanel(openPanel === "curation" ? null : "curation")}
      >
        <span>큐레이션</span>
        <strong>{curationLabel}</strong>
      </button>
      <button type="submit" className="search-submit" aria-label="검색">
        ⌕
      </button>

      {openPanel ? (
        <div className="filter-panel" role="dialog" aria-label="검색 필터 패널">
          {openPanel === "date" ? (
            <div className="filter-panel-content">
              <p className="filter-panel-title">날짜</p>
              <div className="filter-chip-group">
                {DATE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={date === option.value ? "filter-chip active" : "filter-chip"}
                    onClick={() => setDate(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {openPanel === "district" ? (
            <div className="filter-panel-content">
              <p className="filter-panel-title">장소</p>
              <div className="filter-chip-group">
                {REGION_GROUPS.map((group) => (
                  <button
                    key={group.region}
                    type="button"
                    className={
                      regions.includes(group.region) ? "filter-chip active" : "filter-chip"
                    }
                    onClick={() => toggleRegion(group.region)}
                  >
                    {group.region}
                  </button>
                ))}
              </div>
              <p className="filter-panel-title">세부 지역</p>
              <p className="field-hint">추천 동네 + 직접 입력한 동네명을 함께 쓸 수 있습니다.</p>
              <div className="filter-chip-group">
                {Array.from(
                  new Set([
                    ...REGION_GROUPS.filter(
                      (group) => regions.length === 0 || regions.includes(group.region)
                    ).flatMap((group) => [...group.districts]),
                    ...districts
                  ])
                ).map((district) => (
                  <button
                    key={district}
                    type="button"
                    className={
                      districts.includes(district) ? "filter-chip active" : "filter-chip"
                    }
                    onClick={() => toggleDistrict(district)}
                  >
                    {district}
                  </button>
                ))}
              </div>
              <div className="admin-custom-tag-row">
                <input
                  placeholder="동네 직접 입력 (예: 문래)"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const value = event.currentTarget.value.trim();
                    if (!value) return;
                    if (!districts.includes(value)) {
                      setDistricts((prev) => [...prev, value]);
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </div>
              <p className="filter-panel-title">카테고리</p>
              <div className="filter-chip-group">
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      categories.includes(category) ? "filter-chip active" : "filter-chip"
                    }
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {openPanel === "curation" ? (
            <div className="filter-panel-content">
              <p className="filter-panel-title">큐레이션</p>
              <div className="filter-chip-group">
                {CURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={curation === option.value ? "filter-chip active" : "filter-chip"}
                    onClick={() => setCuration(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="filter-query">
                키워드 검색
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="전시명, 작가, 장소"
                />
              </label>
            </div>
          ) : null}

          <div className="filter-panel-actions">
            <button type="button" className="secondary-button" onClick={() => setOpenPanel(null)}>
              닫기
            </button>
            <button type="submit" className="primary-button">
              검색
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
