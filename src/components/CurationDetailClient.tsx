"use client";

import { CurationMapEmbed } from "@/components/CurationMapEmbed";
import { ShareActionButton } from "@/components/ShareActionButton";
import { StoryRenderer } from "@/components/StoryRenderer";
import {
  getDistanceHint,
  getEditorialBadges,
  parseCourseDescription
} from "@/lib/curation-course";
import {
  CURATION_STOP_TYPE_LABEL,
  type CurationExhibitionItem,
  type CurationSummary
} from "@/lib/exhibitions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CurationDetailClientProps = {
  curation: CurationSummary;
  relatedCurations: CurationSummary[];
  exhibitions: CurationExhibitionItem[];
  isLoggedIn: boolean;
};

function formatPeriod(startDate: string, endDate: string) {
  const fmt = (date: string) => {
    const [, month, day] = date.split("-");
    return `${Number(month)}.${Number(day)}`;
  };

  return `${fmt(startDate)}~${fmt(endDate)}`;
}

function formatUpdatedAt(iso: string) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 업데이트`;
}

function splitBadges(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CurationDetailClient({
  curation,
  relatedCurations,
  exhibitions,
  isLoggedIn
}: CurationDetailClientProps) {
  const router = useRouter();
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState<"recommend" | "ending">("recommend");
  const [savedIds, setSavedIds] = useState(
    () => new Set(exhibitions.filter((item) => item.saved).map((item) => item.id))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  const course = useMemo(
    () => parseCourseDescription(curation.description),
    [curation.description]
  );

  // 공간/장소를 포함한 stop 기반 코스인지 (레거시 전시 합성 stop 제외)
  const isStopCourse = useMemo(
    () =>
      curation.stops.length > 0 &&
      curation.stops.some((stop) => !stop.id.startsWith("legacy-")),
    [curation.stops]
  );

  const basePlace = useMemo(() => {
    if (curation.basePlace) {
      return {
        name: curation.basePlace.name,
        address: curation.basePlace.address,
        reason: curation.basePlace.notes,
        placeUrl:
          curation.basePlace.sourceUrl ||
          `https://map.naver.com/p/search/${encodeURIComponent(curation.basePlace.name)}`,
        lat: curation.basePlace.lat,
        lng: curation.basePlace.lng
      };
    }
    return course.basePlace;
  }, [curation.basePlace, course.basePlace]);

  const metaLine = useMemo(() => {
    if (isStopCourse) {
      const counts = new Map<string, number>();
      for (const stop of curation.stops) {
        counts.set(stop.stopType, (counts.get(stop.stopType) ?? 0) + 1);
      }
      const countParts = Array.from(counts.entries()).map(
        ([type, count]) =>
          `${CURATION_STOP_TYPE_LABEL[type as keyof typeof CURATION_STOP_TYPE_LABEL]} ${count}곳`
      );
      return [curation.neighborhood, ...countParts, curation.durationText]
        .filter(Boolean)
        .join(" · ");
    }

    const parts = [
      curation.neighborhood,
      curation.basePlace ? `${curation.basePlace.name} 거점` : null,
      curation.radiusMeters ? `도보 약 ${Math.round(curation.radiusMeters / 80)}분` : null,
      `전시 ${exhibitions.length}곳`,
      curation.durationText
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(" · ");
    return curation.subtitle;
  }, [curation, exhibitions.length, isStopCourse]);

  const isSingleDistrict = useMemo(() => {
    const districts = new Set(exhibitions.map((item) => item.district));
    return districts.size <= 1;
  }, [exhibitions]);

  const regions = useMemo(() => {
    const set = new Set(exhibitions.map((item) => item.region));
    return ["all", ...Array.from(set)];
  }, [exhibitions]);

  const filtered = useMemo(() => {
    let list = [...exhibitions];

    if (region !== "all") {
      list = list.filter((item) => item.region === region);
    }

    if (sort === "ending") {
      list.sort((a, b) => a.endDate.localeCompare(b.endDate));
    } else {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return list;
  }, [exhibitions, region, sort]);

  const mapBasePlace =
    basePlace?.lat != null && basePlace?.lng != null
      ? { name: basePlace.name, lat: basePlace.lat, lng: basePlace.lng }
      : null;

  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CURATION_VIEW",
        source: "curation_detail",
        metadata: { curationId: curation.id, title: curation.title }
      })
    }).catch(() => undefined);
  }, [curation.id, curation.title]);

  async function toggleSave(exhibitionId: string) {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/curations/${curation.id}`);
      return;
    }

    setPendingId(exhibitionId);
    const response = await fetch("/api/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exhibitionId, source: "curation", curationId: curation.id })
    });
    setPendingId(null);

    if (response.ok) {
      const data = await response.json();
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (data.saved) next.add(exhibitionId);
        else next.delete(exhibitionId);
        return next;
      });
    }
  }

  async function handlePlaceClick() {
    if (!basePlace) return;

    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "PLACE_CLICK",
        source: "curation_detail",
        metadata: {
          curationId: curation.id,
          placeName: basePlace.name,
          placeUrl: basePlace.placeUrl,
          placeId: curation.basePlace?.id ?? null
        }
      })
    }).catch(() => undefined);
  }

  const coverStyle = curation.coverImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35)), url(${curation.coverImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : { background: curation.coverTone };

  return (
    <main className="curation-detail-page">
      <section className="curation-detail-intro">
        <nav className="curation-crumb" aria-label="Breadcrumb">
          <Link href="/">홈</Link>
          <span>/</span>
          <span>지역 코스</span>
          <span>/</span>
          <strong>{curation.title}</strong>
        </nav>

        <div className="curation-detail-cover" style={coverStyle} aria-hidden="true" />

        <p className="curation-detail-eyebrow">
          <span className="src-tag manual">
            {isStopCourse ? "작가 공간 코스" : "자유 동선 코스"}
          </span>
          {isStopCourse ? "순서대로 걷는 동선" : "베이스캠프 · 반경 내 전시"}
          {curation.situationTags.length > 0
            ? ` · ${curation.situationTags.join(" · ")}`
            : null}
        </p>
        <h1 className="curation-detail-title">{curation.title}</h1>

        <p className="curation-detail-meta">
          {metaLine}
          <span className="meta-dot">·</span>
          {formatUpdatedAt(curation.updatedAt)}
        </p>

        {course.intro ? <p className="curation-detail-desc">{course.intro}</p> : null}

        <StoryRenderer
          title="코스 이야기"
          className="story-renderer curation-story"
          storyJson={curation.storyJson}
          imageUrls={curation.descriptionImages}
        />

        <div className="curation-detail-actions">
          <ShareActionButton
            label="코스 공유"
            title={curation.title}
            text={`${curation.title} — Exhibit 지역 코스`}
            path={`/curations/${curation.id}`}
            eventType="CURATION_SHARE"
            source="curation_detail"
            metadata={{ curationId: curation.id }}
          />
        </div>

        {basePlace ? (
          <article className="course-base-card">
            <p className="course-base-label">거점</p>
            <h2 className="course-base-name">{basePlace.name}</h2>
            {basePlace.address ? (
              <p className="course-base-address">{basePlace.address}</p>
            ) : null}
            {basePlace.reason ? (
              <p className="course-base-reason">{basePlace.reason}</p>
            ) : null}
            {basePlace.placeUrl ? (
              <a
                className="course-base-link"
                href={basePlace.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void handlePlaceClick();
                }}
              >
                플레이스 보기
              </a>
            ) : null}
          </article>
        ) : null}

        {course.flow.length > 0 ? (
          <section className="course-flow" aria-labelledby="course-flow-title">
            <h2 id="course-flow-title">추천 흐름</h2>
            <ol>
              {course.flow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="course-flow" aria-labelledby="course-flow-title">
            <h2 id="course-flow-title">추천 흐름</h2>
            <ol>
              <li>{basePlace ? `${basePlace.name}에서 쉬기` : "거점에서 쉬기"}</li>
              <li>가까운 전시 1~2곳 골라 보기</li>
              <li>여유 있으면 산책하거나 한 곳 더</li>
            </ol>
          </section>
        )}

        {course.tip ? (
          <p className="course-tip">
            <strong>팁</strong> {course.tip}
          </p>
        ) : null}

        {relatedCurations.length > 0 ? (
          <div className="curation-related">
            {relatedCurations.map((item) => (
              <Link
                key={item.id}
                href={`/curations/${item.id}`}
                className={item.id === curation.id ? "related-chip active" : "related-chip"}
              >
                {item.title}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {isStopCourse ? (
        <section className="curation-detail-body">
          <aside className="curation-detail-map-panel">
            <CurationMapEmbed
              stops={curation.stops}
              basePlace={mapBasePlace}
              pinVariant="compact"
            />
            <p className="curation-map-note">
              번호 순서대로 걸으면 하나의 동선이 완성됩니다. 원하는 곳만 골라도
              좋아요.
            </p>
          </aside>

          <div className="curation-detail-list-panel">
            <div className="curation-list-heading">
              <h2>코스 순서</h2>
              <p>작가 공간과 쉬어갈 곳을 하나의 동선으로 엮었습니다.</p>
            </div>

            <ol className="curation-stop-list">
              {curation.stops.map((stop) => {
                const isExhibitionStop = stop.stopType === "EXHIBITION";
                const href = isExhibitionStop
                  ? `/exhibitions/${stop.refId}?from=curation&curationId=${curation.id}`
                  : stop.href;

                return (
                  <li key={stop.id} className="curation-stop-row">
                    <span className="curation-stop-order" aria-hidden="true">
                      {stop.sortOrder + 1}
                    </span>
                    {stop.heroImageUrl ? (
                      <div
                        className="curation-stop-thumb"
                        style={{
                          backgroundImage: `url(${stop.heroImageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center"
                        }}
                        aria-hidden="true"
                      />
                    ) : stop.stopType === "PLACE" ? (
                      <div
                        className={`curation-stop-thumb curation-stop-thumb--place place-${
                          stop.subtitle?.includes("식당")
                            ? "restaurant"
                            : stop.subtitle?.includes("산책")
                              ? "walk"
                              : stop.subtitle?.includes("카페")
                                ? "cafe"
                                : "etc"
                        }`}
                        aria-hidden="true"
                      >
                        <span>{stop.subtitle ?? "장소"}</span>
                      </div>
                    ) : (
                      <div
                        className="curation-stop-thumb curation-stop-thumb--fallback"
                        style={{
                          background:
                            stop.heroTone ??
                            "linear-gradient(135deg, #ece7df, #cbc2b4)"
                        }}
                        aria-hidden="true"
                      >
                        <span>{CURATION_STOP_TYPE_LABEL[stop.stopType]}</span>
                      </div>
                    )}
                    <div className="curation-stop-info">
                      <p className="curation-stop-type">
                        {CURATION_STOP_TYPE_LABEL[stop.stopType]}
                        {stop.distanceText ? ` · ${stop.distanceText}` : ""}
                      </p>
                      {href ? (
                        <Link href={href} className="curation-stop-title">
                          {stop.title}
                        </Link>
                      ) : stop.externalUrl ? (
                        <a
                          href={stop.externalUrl}
                          className="curation-stop-title"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {stop.title}
                        </a>
                      ) : (
                        <span className="curation-stop-title">{stop.title}</span>
                      )}
                      {stop.subtitle ? (
                        <p className="curation-stop-subtitle">{stop.subtitle}</p>
                      ) : null}
                      {stop.editorialBadge ? (
                        <span className="curation-edit-badge tone-near">
                          {stop.editorialBadge}
                        </span>
                      ) : null}
                      {stop.note ? (
                        <p className="curation-stop-note">{stop.note}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : (
      <section className="curation-detail-body">
        <aside className="curation-detail-map-panel">
          <CurationMapEmbed
            exhibitions={filtered}
            basePlace={mapBasePlace}
            pinVariant="compact"
          />
          <p className="curation-map-note">
            거점과 반경 안 전시 위치입니다. 원하는 전시를 골라 동선을 만드세요.
          </p>
        </aside>

        <div className="curation-detail-list-panel">
          <div className="curation-list-heading">
            <h2>이 반경 안 전시</h2>
            <p>메인/사이드 없이, 원하는 곳만 골라 가세요.</p>
          </div>

          {!isSingleDistrict ? (
            <div className="curation-filter-bar">
              <label className="filter-chip">
                지역
                <select value={region} onChange={(event) => setRegion(event.target.value)}>
                  {regions.map((value) => (
                    <option key={value} value={value}>
                      {value === "all" ? "전체" : value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-chip">
                정렬
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as "recommend" | "ending")}
                >
                  <option value="recommend">추천순</option>
                  <option value="ending">마감 임박순</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="curation-filter-bar">
              <label className="filter-chip">
                정렬
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as "recommend" | "ending")}
                >
                  <option value="recommend">거리·추천순</option>
                  <option value="ending">마감 임박순</option>
                </select>
              </label>
            </div>
          )}

          <div className="curation-list-rows">
            {filtered.length > 0 ? (
              filtered.map((exhibition) => {
                const originalIndex = exhibitions.findIndex((item) => item.id === exhibition.id);
                const storedBadges = splitBadges(exhibition.editorialBadge);
                const badges =
                  storedBadges.length > 0
                    ? storedBadges.map((label) => ({ label }))
                    : getEditorialBadges(exhibition, Math.max(originalIndex, 0));
                const distance =
                  exhibition.distanceText || getDistanceHint(Math.max(originalIndex, 0));
                const href = `/exhibitions/${exhibition.id}?from=curation&curationId=${curation.id}`;

                return (
                  <article key={exhibition.id} className="curation-list-row">
                    <Link
                      href={href}
                      className="curation-list-thumb"
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
                    <div className="curation-list-info">
                      <div className="curation-list-top">
                        <div>
                          <p className="curation-list-index">
                            {originalIndex >= 0 ? originalIndex + 1 : "·"}
                            {distance ? ` · ${distance}` : null}
                          </p>
                          <Link href={href} className="curation-list-title">
                            {exhibition.title}
                          </Link>
                          <p className="curation-list-venue">
                            {exhibition.venue} · {exhibition.district} ·{" "}
                            {formatPeriod(exhibition.startDate, exhibition.endDate)}
                          </p>
                          {badges.length > 0 ? (
                            <div className="curation-badge-row">
                              {badges.map((badge) => (
                                <span
                                  key={badge.label}
                                  className={`curation-edit-badge tone-${"tone" in badge ? badge.tone ?? "near" : "near"}`}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className={savedIds.has(exhibition.id) ? "heart-btn active" : "heart-btn"}
                          aria-label={savedIds.has(exhibition.id) ? "저장 취소" : "저장하기"}
                          disabled={pendingId === exhibition.id}
                          onClick={() => toggleSave(exhibition.id)}
                        >
                          {savedIds.has(exhibition.id) ? "♥" : "♡"}
                        </button>
                      </div>
                      <p className="curation-list-why">{exhibition.summary}</p>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">조건에 맞는 전시가 없습니다.</div>
            )}
          </div>
        </div>
      </section>
      )}
    </main>
  );
}
