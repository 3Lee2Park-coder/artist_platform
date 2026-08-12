"use client";

import { VisitShareCard } from "@/components/VisitShareCard";
import type { VisitArchiveEntry } from "@/lib/visit-archive";
import Link from "next/link";
import { useMemo, useState } from "react";

type VisitArchiveSectionProps = {
  entries: VisitArchiveEntry[];
  userName: string;
};

type KindFilter = "ALL" | "EXHIBITION" | "SPACE" | "PROGRAM";

const FILTER_LABEL: Record<KindFilter, string> = {
  ALL: "전체",
  EXHIBITION: "전시",
  SPACE: "공간",
  PROGRAM: "프로그램"
};

function formatVisitedDate(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

// MY 페이지 방문 아카이브 — 전시/공간/프로그램 방문을 타임라인으로 모으고 공유 카드 제공
export function VisitArchiveSection({ entries, userName }: VisitArchiveSectionProps) {
  const [filter, setFilter] = useState<KindFilter>("ALL");
  const [shareEntry, setShareEntry] = useState<VisitArchiveEntry | null>(null);

  const availableFilters = useMemo(() => {
    const kinds = new Set(entries.map((entry) => entry.kind));
    const filters: KindFilter[] = ["ALL"];
    (["SPACE", "PROGRAM", "EXHIBITION"] as const).forEach((kind) => {
      if (kinds.has(kind)) filters.push(kind);
    });
    return filters;
  }, [entries]);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? entries
        : entries.filter((entry) => entry.kind === filter),
    [entries, filter]
  );

  if (entries.length === 0) {
    return (
      <section className="visit-archive">
        <div className="visit-archive-heading">
          <h2>찾기 아카이브</h2>
          <p>찾아낸 전시·공간·프로그램이 여기에 쌓입니다.</p>
        </div>
        <div className="empty-state">
          아직 찾은 기록이 없습니다. 마음에 든 곳에서 &lsquo;다녀왔어요&rsquo;를
          눌러 단서를 남겨보세요.
        </div>
      </section>
    );
  }

  return (
    <section className="visit-archive">
      <div className="visit-archive-heading">
        <h2>찾기 아카이브</h2>
        <p>
          지금까지 {entries.length}곳을 찾아냈어요 — 카드를 만들어 인스타그램에
          자랑해보세요.
        </p>
      </div>

      {availableFilters.length > 2 ? (
        <div className="visit-archive-filters" role="tablist" aria-label="기록 필터">
          {availableFilters.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              className={
                filter === item
                  ? "visit-archive-filter active"
                  : "visit-archive-filter"
              }
              onClick={() => setFilter(item)}
            >
              {FILTER_LABEL[item]}
            </button>
          ))}
        </div>
      ) : null}

      <ol className="visit-archive-timeline">
        {filtered.map((entry) => (
          <li key={entry.id} className="visit-archive-item">
            <div
              className="visit-archive-thumb"
              style={
                entry.heroImageUrl
                  ? {
                      backgroundImage: `url(${entry.heroImageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }
                  : { background: entry.heroTone }
              }
              aria-hidden="true"
            />
            <div className="visit-archive-copy">
              <p className="visit-archive-meta">
                <span className={`visit-kind-badge kind-${entry.kind.toLowerCase()}`}>
                  {entry.kindLabel}
                </span>
                {formatVisitedDate(entry.visitedAt)}
                {entry.district ? ` · ${entry.district}` : ""}
              </p>
              <Link href={entry.href} className="visit-archive-title">
                {entry.title}
              </Link>
              {entry.subtitle ? (
                <p className="visit-archive-subtitle">{entry.subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="visit-archive-share"
              onClick={() => setShareEntry(entry)}
            >
              공유 카드
            </button>
          </li>
        ))}
      </ol>

      {shareEntry ? (
        <VisitShareCard
          entry={shareEntry}
          userName={userName}
          onClose={() => setShareEntry(null)}
        />
      ) : null}
    </section>
  );
}
