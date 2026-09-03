"use client";

import { DeckExperience } from "@/components/DeckExperience";
import { DeckStack } from "@/components/DeckStack";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import { DECK_BRAND, pickTodayDecks, type OoofDeck } from "@/lib/decks";
import type { CurationSummary } from "@/lib/exhibitions";
import { useEffect, useRef, useState } from "react";

type TodayDeckSectionProps = {
  curations: CurationSummary[];
  limit?: number;
};

export function TodayDeckSection({ curations, limit = 2 }: TodayDeckSectionProps) {
  const decks = pickTodayDecks(curations, limit);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const openDeck = decks.find((deck) => deck.id === openId) ?? null;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setLoggedIn(Boolean(data.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    if (!openDeck) return;
    const section = document.getElementById("today-deck");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [openDeck]);

  if (decks.length === 0) return null;

  function moveRail(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(260, rail.clientWidth * 0.82),
      behavior: "smooth"
    });
  }

  return (
    <section
      className={`home-section ooof-today-decks${openDeck ? " is-open-stage" : ""}`}
      id="today-deck"
      aria-labelledby="today-deck-title"
    >
      {openDeck ? (
        <h2 id="today-deck-title" className="sr-only">
          {openDeck.title}
        </h2>
      ) : (
        <HomeSectionHeader
          eyebrow="전시부터 그 곁의 장소까지"
          title={DECK_BRAND.homeLabel}
          titleId="today-deck-title"
          description="함께 둘러보기 좋은 전시·공간·동네 장소를 하나의 코스로 골랐습니다. 카드를 펼쳐 오늘의 동선을 확인해 보세요."
          actionLabel="모든 발견 코스"
          actionHref="/decks"
        />
      )}

      {openDeck ? (
        <DeckExperience
          key={openDeck.id}
          deck={openDeck}
          isLoggedIn={loggedIn}
          defaultOpen
          loginRedirect="/"
          onClose={() => setOpenId(null)}
        />
      ) : (
        <div className="ooof-today-browser">
          {decks.length > 1 ? (
            <button
              type="button"
              className="ooof-today-arrow is-prev"
              onClick={() => moveRail(-1)}
              aria-label="이전 발견 코스"
            >
              ‹
            </button>
          ) : null}
          <div
            ref={railRef}
            className={decks.length > 1 ? "ooof-today-rail" : "ooof-today-single"}
          >
            {decks.map((deck: OoofDeck) => (
              <article key={deck.id} className="ooof-today-item">
                <DeckStack deck={deck} size="hero" onOpen={() => setOpenId(deck.id)} />
                <div className="ooof-today-actions">
                  <button type="button" className="ooof-btn-fill" onClick={() => setOpenId(deck.id)}>
                    카드 펼쳐보기
                  </button>
                </div>
              </article>
            ))}
          </div>
          {decks.length > 1 ? (
            <button
              type="button"
              className="ooof-today-arrow is-next"
              onClick={() => moveRail(1)}
              aria-label="다음 발견 코스"
            >
              ›
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
