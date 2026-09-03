"use client";

import { DeckStack } from "@/components/DeckStack";
import { groupDecks, type DeckArchiveTab, type OoofDeck } from "@/lib/decks";
import { useMemo, useState } from "react";

type DeckArchiveProps = {
  live: OoofDeck[];
  closed: OoofDeck[];
};

const TABS: { id: DeckArchiveTab; label: string }[] = [
  { id: "latest", label: "LATEST" },
  { id: "city", label: "CITY" },
  { id: "mood", label: "MOOD" }
];

export function DeckArchive({ live, closed }: DeckArchiveProps) {
  const [tab, setTab] = useState<DeckArchiveTab>("latest");
  const rows = useMemo(() => groupDecks(live, tab), [live, tab]);

  return (
    <div className="ooof-archive">
      {live.length > 0 ? (
        <div className="ooof-archive-tabs" role="tablist" aria-label="덱 나누기">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "is-on" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {rows.map((row) => (
        <section key={row.id} className="ooof-archive-row">
          <h2>{row.title}</h2>
          <div className="ooof-archive-rail">
            {row.items.map((deck) => (
              <DeckStack
                key={deck.id}
                deck={deck}
                href={deck.href}
              />
            ))}
          </div>
        </section>
      ))}

      {closed.length > 0 ? (
        <section className="ooof-archive-row">
          <h2>기간이 지난 덱</h2>
          <p>담긴 전시가 끝난 묶음입니다. 동네 장소 카드는 그대로 남아 있습니다.</p>
          <div className="ooof-archive-rail">
            {closed.map((deck) => (
              <DeckStack
                key={deck.id}
                deck={deck}
                href={deck.href}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
