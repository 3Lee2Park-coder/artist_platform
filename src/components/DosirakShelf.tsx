"use client";

import { DosirakObject } from "@/components/DosirakObject";
import { DosirakTracker } from "@/components/DosirakTracker";
import {
  DOSIRAK_BRAND,
  DOSIRAK_SHELF_TABS,
  groupDosiraksForShelf,
  type Dosirak,
  type DosirakShelfTabId
} from "@/lib/dosirak";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

type DosirakShelfProps = {
  served: Dosirak[];
  closed: Dosirak[];
};

function ShelfRow({
  title,
  note,
  items,
  onPick,
  titleId
}: {
  title: string;
  note?: string;
  items: Dosirak[];
  onPick: (dosirak: Dosirak) => void;
  titleId: string;
}) {
  return (
    <section className="dk-shelf-row" aria-labelledby={titleId}>
      <div className="dk-shelf-copy">
        <h2 id={titleId}>{title}</h2>
        {note ? <p>{note}</p> : null}
      </div>
      <div className="dk-shelf-rail-wrap">
        <div className="dk-shelf-line" aria-hidden="true" />
        <div className="dk-shelf-rail">
          {items.map((dosirak) => (
            <DosirakTracker
              key={dosirak.id}
              dosirak={dosirak}
              surface="dosirak_index"
            >
              <DosirakObject
                dosirak={dosirak}
                size="shelf"
                peekable={false}
                onActivate={() => onPick(dosirak)}
              />
            </DosirakTracker>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DosirakShelf({ served, closed }: DosirakShelfProps) {
  const [tab, setTab] = useState<DosirakShelfTabId>("recent");
  const [activeId, setActiveId] = useState<string | null>(null);
  const labelId = useId();

  const aisles = useMemo(
    () => groupDosiraksForShelf(served, closed, tab),
    [served, closed, tab]
  );
  const catalog = useMemo(() => [...served, ...closed], [served, closed]);
  const active = catalog.find((item) => item.id === activeId) ?? null;
  const showTabs = served.length > 0;

  useEffect(() => {
    if (!activeId) return;
    document.getElementById("dk-archive-stage")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start"
    });
  }, [activeId]);

  return (
    <div className="dk-archive">
      {showTabs ? (
        <div className="dk-shelf-tabs" role="tablist" aria-label="도시락 나누기">
          {DOSIRAK_SHELF_TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${labelId}-tab-${item.id}`}
                aria-selected={selected}
                className={selected ? "dk-shelf-tab is-on" : "dk-shelf-tab"}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {active ? (
        <section className="dk-archive-stage" id="dk-archive-stage">
          <div className="dk-archive-stage-bar">
            <button
              type="button"
              className="dk-back"
              onClick={() => setActiveId(null)}
            >
              ← 진열대로
            </button>
            <p>
              {DOSIRAK_BRAND.unit} {active.number}
              {active.neighborhood ? ` · ${active.neighborhood}` : ""}
            </p>
          </div>
          <DosirakObject
            key={active.id}
            dosirak={active}
            defaultOpen
            size="detail"
            peekable
          />
          <div className="dk-archive-stage-foot">
            <p>칸을 눌러 장소를 먼저 둘러본 뒤, 지도에서 동선을 이어 보세요.</p>
            <Link className="dk-peek-go" href={active.href}>
              지도와 동선 보기
            </Link>
          </div>
        </section>
      ) : null}

      {served.length === 0 && closed.length > 0 ? (
        <p className="dk-shelf-empty">지금은 열려 있는 도시락이 없습니다.</p>
      ) : null}

      <div className={active ? "dk-archive-shelves is-dim" : "dk-archive-shelves"}>
        {aisles.map((aisle) => (
          <ShelfRow
            key={`${tab}-${aisle.id}`}
            titleId={`${labelId}-${aisle.id}`}
            title={aisle.title}
            note={aisle.note}
            items={aisle.items}
            onPick={(item) => setActiveId(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
