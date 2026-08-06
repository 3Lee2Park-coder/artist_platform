"use client";

import { ExhibitionCard } from "@/components/ExhibitionCard";
import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SourceFilter = "all" | "artist" | "public";
type TimingFilter = "all" | "ongoing" | "upcoming" | "ending_soon";
type DatePreset = "all" | "today" | "this_week";
type CurationFilter = "all" | "curation" | "reservable";

type ExhibitionsDirectoryClientProps = {
  exhibitions: Exhibition[];
  initialSource?: SourceFilter;
  initialTiming?: TimingFilter;
  initialDate?: DatePreset;
  initialQuery?: string;
  initialRegions?: string[];
  initialDistricts?: string[];
  initialCategories?: string[];
  initialCuration?: CurationFilter;
};

function getTodayKST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul"
  }).format(new Date());
}

function addDaysKST(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T12:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul"
  }).format(date);
}

function overlapsRange(
  startDate: string,
  endDate: string,
  rangeStart: string,
  rangeEnd: string
) {
  return startDate <= rangeEnd && endDate >= rangeStart;
}

const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "artist", label: "작가 등록" },
  { value: "public", label: "공공·기관" }
];

const TIMING_FILTERS: Array<{ value: TimingFilter; label: string }> = [
  { value: "all", label: "전체 기간" },
  { value: "ongoing", label: "진행 중" },
  { value: "upcoming", label: "예정" },
  { value: "ending_soon", label: "마감 임박" }
];

function isArtistSource(source: Exhibition["source"]) {
  return source === "ARTIST" || source === "ADMIN";
}

function formatPeriod(startDate: string, endDate: string) {
  const fmt = (date: string) => {
    const [, month, day] = date.split("-");
    return `${Number(month)}.${Number(day)}`;
  };
  return `${fmt(startDate)}–${fmt(endDate)}`;
}

function ExhibitionRailCard({ exhibition }: { exhibition: Exhibition }) {
  return (
    <Link href={`/exhibitions/${exhibition.id}`} className="exhub-rail-card">
      <div
        className="exhub-rail-thumb"
        style={
          exhibition.heroImageUrl
            ? {
                backgroundImage: `url(${exhibition.heroImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }
            : { background: exhibition.heroTone }
        }
        aria-hidden="true"
      />
      <div className="exhub-rail-copy">
        <p className="exhub-rail-meta">
          {exhibition.district || exhibition.region}
          <span>·</span>
          {formatPeriod(exhibition.startDate, exhibition.endDate)}
        </p>
        <strong>{exhibition.title}</strong>
        <span>{exhibition.venue || exhibition.artist}</span>
      </div>
    </Link>
  );
}

export function ExhibitionsDirectoryClient({
  exhibitions,
  initialSource = "all",
  initialTiming = "all",
  initialDate = "all",
  initialQuery = "",
  initialRegions = [],
  initialDistricts = [],
  initialCategories = [],
  initialCuration = "all"
}: ExhibitionsDirectoryClientProps) {
  const [source, setSource] = useState<SourceFilter>(initialSource);
  const [timing, setTiming] = useState<TimingFilter>(initialTiming);
  const [datePreset, setDatePreset] = useState<DatePreset>(initialDate);
  const [query, setQuery] = useState(initialQuery);
  const [regions, setRegions] = useState<string[]>(initialRegions);
  const [districtsFilter, setDistrictsFilter] = useState<string[]>(initialDistricts);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [curation, setCuration] = useState<CurationFilter>(initialCuration);
  const [district, setDistrict] = useState<string>(initialDistricts[0] ?? "all");
  const [publicVisible, setPublicVisible] = useState(24);

  useEffect(() => {
    setSource(initialSource);
    setTiming(initialTiming);
    setDatePreset(initialDate);
    setQuery(initialQuery);
    setRegions(initialRegions);
    setDistrictsFilter(initialDistricts);
    setCategories(initialCategories);
    setCuration(initialCuration);
    setDistrict(initialDistricts[0] ?? "all");
    setPublicVisible(24);
  }, [
    initialSource,
    initialTiming,
    initialDate,
    initialQuery,
    initialRegions,
    initialDistricts,
    initialCategories,
    initialCuration
  ]);

  const districts = useMemo(() => {
    const set = new Set(exhibitions.map((item) => item.district).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [exhibitions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = getTodayKST();
    const weekEnd = addDaysKST(today, 6);
    const now = new Date();

    return exhibitions.filter((exhibition) => {
      if (source === "artist" && !isArtistSource(exhibition.source)) return false;
      if (source === "public" && exhibition.source !== "PUBLIC_API") return false;

      if (datePreset === "today") {
        if (!(exhibition.startDate <= today && exhibition.endDate >= today)) {
          return false;
        }
      }

      if (datePreset === "this_week") {
        if (!overlapsRange(exhibition.startDate, exhibition.endDate, today, weekEnd)) {
          return false;
        }
      }

      if (timing === "ongoing") {
        if (
          exhibition.lifecycle !== "ongoing" &&
          exhibition.lifecycle !== "ending_soon" &&
          exhibition.lifecycle !== "extended"
        ) {
          return false;
        }
      }

      if (timing === "upcoming" && exhibition.lifecycle !== "upcoming") return false;

      if (timing === "ending_soon") {
        if (exhibition.lifecycle === "ending_soon") {
          // ok
        } else if (exhibition.lifecycle === "ongoing") {
          const end = new Date(`${exhibition.endDate}T00:00:00+09:00`);
          const diff = Math.ceil(
            (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diff < 0 || diff > 7) return false;
        } else {
          return false;
        }
      }

      if (regions.length > 0 && !regions.includes(exhibition.region)) {
        return false;
      }

      if (districtsFilter.length > 0) {
        if (!districtsFilter.includes(exhibition.district)) return false;
      } else if (district !== "all" && exhibition.district !== district) {
        return false;
      }

      if (
        categories.length > 0 &&
        !exhibition.categories.some((category) => categories.includes(category))
      ) {
        return false;
      }

      if (curation === "curation" && !exhibition.curationAvailable) return false;
      if (curation === "reservable" && !exhibition.reservable) return false;

      if (!q) return true;

      return (
        exhibition.title.toLowerCase().includes(q) ||
        exhibition.artist.toLowerCase().includes(q) ||
        exhibition.venue.toLowerCase().includes(q) ||
        exhibition.district.toLowerCase().includes(q)
      );
    });
  }, [
    exhibitions,
    source,
    timing,
    datePreset,
    query,
    district,
    regions,
    districtsFilter,
    categories,
    curation
  ]);

  const artistList = filtered.filter((item) => isArtistSource(item.source));
  const publicList = filtered.filter((item) => item.source === "PUBLIC_API");

  const spotlight = useMemo(() => {
    const ending = filtered.filter((item) => item.lifecycle === "ending_soon");
    const open = filtered.filter((item) => item.todayOpen);
    const pool = [...ending, ...open, ...filtered];
    const seen = new Set<string>();
    return pool.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 10);
  }, [filtered]);

  const artistFeatured = artistList[0] ?? null;
  const artistRest = artistList.slice(1, 8);
  const publicShown = publicList.slice(0, publicVisible);
  const searching =
    query.trim().length > 0 ||
    source !== "all" ||
    timing !== "all" ||
    datePreset !== "all" ||
    district !== "all" ||
    regions.length > 0 ||
    districtsFilter.length > 0 ||
    categories.length > 0 ||
    curation !== "all";
  const empty = filtered.length === 0;
  const artistCold = artistList.length > 0 && artistList.length < 4;

  return (
    <div className="exhub">
      <div className="exhub-toolbar">
        <form
          className="exhub-search"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="전시·작가·동네 — 지금 갈 곳을 찾아보세요"
            aria-label="전시 검색"
          />
        </form>

        <div className="exhub-filter-row" role="tablist" aria-label="출처">
          {SOURCE_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={source === item.value}
              className={source === item.value ? "taste-chip active" : "taste-chip"}
              onClick={() => setSource(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="exhub-filter-row" role="tablist" aria-label="시기">
          {TIMING_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={timing === item.value}
              className={timing === item.value ? "taste-chip active" : "taste-chip"}
              onClick={() => setTiming(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {districts.length > 1 ? (
          <div className="exhub-filter-row" role="tablist" aria-label="동네">
            <button
              type="button"
              role="tab"
              aria-selected={district === "all"}
              className={district === "all" ? "taste-chip active" : "taste-chip"}
              onClick={() => setDistrict("all")}
            >
              동네 전체
            </button>
            {districts.slice(0, 16).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={district === item}
                className={district === item ? "taste-chip active" : "taste-chip"}
                onClick={() => setDistrict(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="exhub-count">
        {filtered.length.toLocaleString("ko-KR")}개 전시
        {artistCold ? " · 작가 전시는 아직 쌓이는 중" : ""}
      </p>

      {empty ? (
        <div className="exhub-empty">
          <h2>
            {searching
              ? "이 조건으로는 아직 길이 없어요"
              : "아직 열린 전시가 없어요"}
          </h2>
          <p>
            {searching
              ? "날짜·동네·키워드를 조금 넓혀 다시 찾아보거나, 필터를 비워 전체로 열어 보세요."
              : "다른 동네 코스를 둘러보거나, 작가라면 첫 전시를 직접 열어 이 길을 만들어 주세요."}
          </p>
          <div className="exhub-empty-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSource("all");
                setTiming("all");
                setDatePreset("all");
                setDistrict("all");
                setRegions([]);
                setDistrictsFilter([]);
                setCategories([]);
                setCuration("all");
                setQuery("");
              }}
            >
              조건 비우기
            </button>
            {searching ? (
              <Link className="primary-button" href="/exhibitions">
                전체 전시 둘러보기
              </Link>
            ) : (
              <Link className="primary-button" href="/register/exhibition">
                전시 등록하기
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {!searching || spotlight.length > 0 ? (
            <section className="exhub-section">
              <div className="exhub-section-head">
                <div>
                  <p className="eyebrow">Now</p>
                  <h2>지금 눈에 띄는 전시</h2>
                </div>
                <Link className="text-link" href="/map?layer=exhibition">
                  내 주변 지도
                </Link>
              </div>
              <div className="exhub-rail" aria-label="추천 전시 슬라이드">
                {spotlight.map((exhibition) => (
                  <ExhibitionRailCard key={`spot-${exhibition.id}`} exhibition={exhibition} />
                ))}
              </div>
            </section>
          ) : null}

          {(source === "all" || source === "artist") ? (
            <section className="exhub-section">
              <div className="exhub-section-head">
                <div>
                  <p className="eyebrow">Artist</p>
                  <h2>작가 등록 전시</h2>
                  <p>작가가 Exhibit에 직접 올린 전시를 먼저 만납니다.</p>
                </div>
                <Link className="secondary-button" href="/register/exhibition">
                  내 전시 올리기
                </Link>
              </div>

              {artistList.length === 0 ? (
                <div className="exhub-coldstart">
                  <div>
                    <strong>아직 작가 전시가 적어요</strong>
                    <p>
                      공공·기관 전시는 아래에서 충분히 둘러보고, 작가 전시는 첫
                      등록이 이 자리를 채워 줍니다.
                    </p>
                  </div>
                  <Link className="primary-button" href="/register/exhibition">
                    첫 전시 등록
                  </Link>
                </div>
              ) : (
                <div className={`exhub-artist-layout${artistCold ? " cold" : ""}`}>
                  {artistFeatured ? (
                    <div className="exhub-artist-feature">
                      <ExhibitionCard exhibition={artistFeatured} />
                    </div>
                  ) : null}
                  {artistRest.length > 0 ? (
                    <div className="exhub-rail artist-rail" aria-label="작가 전시 더보기">
                      {artistRest.map((exhibition) => (
                        <ExhibitionRailCard
                          key={`artist-${exhibition.id}`}
                          exhibition={exhibition}
                        />
                      ))}
                    </div>
                  ) : null}
                  {artistCold ? (
                    <p className="exhub-cold-note">
                      작가 전시가 늘어날수록 이 영역이 허브의 중심으로 커집니다.
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          <section className="exhub-nearby">
            <div>
              <p className="eyebrow">Nearby</p>
              <h2>가고 싶은 전시 주변 동선</h2>
              <p>
                위치 기반으로 전시를 고르고, 가까운 공간·코스까지 이어서 보세요.
              </p>
            </div>
            <div className="exhub-nearby-actions">
              <Link className="primary-button" href="/map?layer=exhibition">
                지도에서 찾기
              </Link>
              <Link className="secondary-button" href="/">
                추천 코스 보기
              </Link>
            </div>
          </section>

          {(source === "all" || source === "public") && publicList.length > 0 ? (
            <section className="exhub-section">
              <div className="exhub-section-head">
                <div>
                  <p className="eyebrow">Museum &amp; Public</p>
                  <h2>공공·기관 전시</h2>
                  <p>
                    문화정보원·문체부 기반 전시 {publicList.length.toLocaleString("ko-KR")}건
                  </p>
                </div>
              </div>

              <div className="exhub-public-rail" aria-label="공공 전시 하이라이트">
                {publicList.slice(0, 8).map((exhibition) => (
                  <ExhibitionRailCard
                    key={`pub-rail-${exhibition.id}`}
                    exhibition={exhibition}
                  />
                ))}
              </div>

              <div className="exhub-public-grid">
                {publicShown.map((exhibition) => (
                  <ExhibitionCard
                    key={`pub-${exhibition.id}`}
                    exhibition={exhibition}
                    compact
                  />
                ))}
              </div>

              {publicVisible < publicList.length ? (
                <button
                  type="button"
                  className="secondary-button exhub-more"
                  onClick={() => setPublicVisible((n) => n + 24)}
                >
                  더 보기 ({publicList.length - publicVisible}건 남음)
                </button>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
