"use client";

import { AddToDeckDialog } from "@/components/AddToDeckDialog";
import { DeckStack } from "@/components/DeckStack";
import { OoofCard } from "@/components/OoofCard";
import type { OoofCard as OoofCardModel } from "@/lib/cards";
import type { OoofDeck } from "@/lib/decks";
import { useRouter } from "next/navigation";
import { useMemo, useEffect, useRef, useState } from "react";

type DeckExperienceProps = {
  deck: OoofDeck;
  isLoggedIn: boolean;
  defaultOpen?: boolean;
  onClose?: () => void;
  loginRedirect?: string;
};

type Phase = "closed" | "opening" | "open";

const SPREAD = [
  { x: 0, y: -48, r: -1.2 },
  { x: -198, y: -18, r: -7 },
  { x: 198, y: -22, r: 6.5 },
  { x: -108, y: 72, r: -3.2 },
  { x: 118, y: 78, r: 4 },
  { x: -286, y: 36, r: -10 },
  { x: 286, y: 30, r: 9 }
];

const SPREAD_CANVAS = { width: 820, height: 560 };
/** 화면보다 조금 크게 그려 가장자리만 잘리게 하고, 카드 본문은 더 크게 보이게 한다. */
const SCALE_FIT = { width: 560, height: 500 };

function reducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useSpreadScale() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host;

    function measure() {
      const width = root.clientWidth;
      const overlay = root.closest(".is-open-stage");
      const height = overlay
        ? Math.max(280, window.innerHeight - 150)
        : Math.max(320, Math.min(SPREAD_CANVAS.height, width * 0.78));
      const next = Math.min(
        1,
        (width - 8) / SCALE_FIT.width,
        height / SCALE_FIT.height
      );
      setScale(Math.max(0.58, next));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { hostRef, scale };
}

export function DeckExperience({
  deck,
  isLoggedIn,
  defaultOpen = false,
  onClose,
  loginRedirect
}: DeckExperienceProps) {
  const router = useRouter();
  const { hostRef, scale } = useSpreadScale();
  const [phase, setPhase] = useState<Phase>(defaultOpen ? "opening" : "closed");
  const [order, setOrder] = useState(deck.cards.map((_, index) => index));
  const [shuffling, setShuffling] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [cards, setCards] = useState(deck.cards);
  const [addKey, setAddKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const cardSignature = deck.cards.map((card) => card.key).join("|");
  const [syncedSignature, setSyncedSignature] = useState(cardSignature);
  if (cardSignature !== syncedSignature) {
    setSyncedSignature(cardSignature);
    setCards(deck.cards);
    setOrder(deck.cards.map((_, index) => index));
  }

  const selected = cards.find((card) => card.key === selectedKey) ?? null;

  useEffect(() => {
    if (phase !== "opening") return;
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DECK_OPEN",
        source: deck.isCurated ? "curated_deck" : "my_deck",
        metadata: { deckId: deck.id, title: deck.title, cardCount: deck.cardCount }
      })
    }).catch(() => undefined);
    const delay = reducedMotion() ? 0 : 1600;
    const timer = window.setTimeout(() => setPhase("open"), delay);
    return () => window.clearTimeout(timer);
  }, [phase, deck.id, deck.title, deck.cardCount, deck.isCurated]);

  const spreadCards = useMemo(
    () => order.map((index) => cards[index]).filter(Boolean),
    [order, cards]
  );

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const skipClickRef = useRef(false);
  const [dragHint, setDragHint] = useState(false);

  useEffect(() => {
    if (phase !== "open") return;
    const mq = window.matchMedia("(max-width: 800px)");
    setDragHint(mq.matches && spreadCards.length > 1);
  }, [phase, spreadCards.length]);

  function rotateCards(direction: 1 | -1) {
    if (spreadCards.length < 2) return;
    setOrder((current) => {
      if (current.length < 2) return current;
      if (direction === 1) {
        return [...current.slice(1), current[0]];
      }
      return [current[current.length - 1], ...current.slice(0, -1)];
    });
  }

  function onSpreadPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "open" || selectedKey || spreadCards.length < 2) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSpreadPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      drag.moved = true;
    }
  }

  function onSpreadPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved || Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
    skipClickRef.current = true;
    rotateCards(dx < 0 ? 1 : -1);
  }

  function openDeck() {
    if (phase !== "closed") return;
    setPhase("opening");
  }

  function closeDeck() {
    setSelectedKey(null);
    setPhase("closed");
    onClose?.();
  }

  function shuffle() {
    if (shuffling) return;
    if (phase === "closed") {
      setOrder((current) => {
        const copy = [...current];
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      });
      return;
    }
    if (phase !== "open") return;
    if (reducedMotion()) {
      setOrder((current) => {
        const copy = [...current];
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      });
      return;
    }
    setShuffling(true);
    window.setTimeout(() => {
      setOrder((current) => {
        const copy = [...current];
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      });
      setShuffling(false);
    }, 1000);
  }

  async function patchCard(card: OoofCardModel, action: "save" | "visit", extra?: Record<string, string>) {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=${loginRedirect ?? deck.href}`);
      return false;
    }
    const response = await fetch("/api/cards/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey: card.key, action, ...extra })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "저장하지 못했습니다.");
      return false;
    }
    setCards((current) =>
      current.map((item) =>
        item.key === card.key
          ? {
              ...item,
              saved: data.saved ?? item.saved,
              visited: data.visited ?? item.visited,
              visitedAt: data.visitedAt ?? item.visitedAt,
              visitedPhotoUrl: data.visitedPhotoUrl ?? item.visitedPhotoUrl
            }
          : item
      )
    );
    return true;
  }

  async function handlePhoto(card: OoofCardModel, file: File) {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=${loginRedirect ?? deck.href}`);
      return;
    }
    const body = new FormData();
    body.set("file", file);
    body.set("folder", "visited");
    const upload = await fetch("/api/upload", { method: "POST", body });
    const uploaded = await upload.json();
    if (!upload.ok) {
      setMessage(uploaded.error ?? "사진을 올리지 못했습니다.");
      return;
    }
    await patchCard(card, "visit", { photoUrl: uploaded.url });
  }

  return (
    <div
      ref={hostRef}
      className={`ooof-deck-experience is-${phase}${shuffling ? " is-shuffling" : ""}`}
      style={{ ["--spread-scale" as string]: String(scale) }}
    >
      {phase !== "closed" ? (
        <button type="button" className="ooof-deck-close" onClick={closeDeck}>
          덱 닫기
        </button>
      ) : null}

      <header className={`ooof-deck-head${phase === "open" ? " is-compact" : ""}`}>
        <p>
          OOOF. DECK {deck.number}
          <span>·</span>
          {deck.cardCount}장
          {deck.location ? (
            <>
              <span>·</span>
              {deck.location}
            </>
          ) : null}
        </p>
        <h1>{deck.title}</h1>
        {phase !== "open" && deck.curatorNote ? (
          <p className="ooof-deck-note">
            {deck.isCurated ? <span>왜 이 카드들인가</span> : null}
            “{deck.curatorNote}”
          </p>
        ) : null}
      </header>

      {phase === "closed" || phase === "opening" ? (
        <div className="ooof-deck-closed-wrap">
          <div className={`ooof-deck-seal${phase === "opening" ? " is-peel" : ""}`} aria-hidden="true" />
          <DeckStack
            deck={deck}
            size="hero"
            onOpen={phase === "closed" ? openDeck : undefined}
          />
        </div>
      ) : null}

      {phase === "closed" ? (
        <div className="ooof-deck-controls">
          <button type="button" className="ooof-btn-fill" onClick={openDeck}>
            덱 열기
          </button>
          <button type="button" onClick={shuffle} disabled={shuffling}>
            섞기
          </button>
        </div>
      ) : null}

      {phase === "open" ? (
        <>
          <div className="ooof-deck-controls">
            <button type="button" onClick={shuffle} disabled={shuffling}>
              섞기
            </button>
          </div>
          {dragHint ? (
            <p className="ooof-spread-hint">좌우로 밀면 가려진 카드가 가운데로 옵니다</p>
          ) : null}
          <div
            className="ooof-deck-spread-frame"
            onPointerDown={onSpreadPointerDown}
            onPointerMove={onSpreadPointerMove}
            onPointerUp={onSpreadPointerUp}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            <div className="ooof-deck-spread" aria-label="열린 덱">
              {spreadCards.map((card, index) => {
                const slot = SPREAD[index] ?? SPREAD[SPREAD.length - 1];
                const isSelected = selectedKey === card.key;
                return (
                  <div
                    key={card.key}
                    className={`ooof-spread-card${isSelected ? " is-selected" : ""}${selectedKey && !isSelected ? " is-dim" : ""}`}
                    style={{
                      ["--spread-x" as string]: `${slot.x}px`,
                      ["--spread-y" as string]: `${slot.y}px`,
                      ["--spread-r" as string]: `${slot.r}deg`,
                      zIndex: isSelected ? 20 : 10 - index,
                      animationDelay: `${index * 80}ms`
                    }}
                  >
                    <button
                      type="button"
                      className="ooof-spread-hit"
                      onClick={(event) => {
                        if (skipClickRef.current) {
                          skipClickRef.current = false;
                          event.preventDefault();
                          return;
                        }
                        setSelectedKey(card.key);
                      }}
                      aria-label={`${card.name} 카드 보기`}
                    />
                    <OoofCard card={card} compact />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {selected ? (
        <div className="ooof-card-inspect">
          <button type="button" className="ooof-dialog-scrim" onClick={() => setSelectedKey(null)} />
          <div className="ooof-card-inspect-stage">
            <button type="button" className="ooof-inspect-back" onClick={() => setSelectedKey(null)}>
              덱으로
            </button>
            <OoofCard
              card={selected}
              flipped={Boolean(flipped[selected.key])}
              onFlip={(next) => setFlipped((current) => ({ ...current, [selected.key]: next }))}
              onSave={async (card) => {
                const ok = await patchCard(card, "save");
                if (ok) setAddKey(card.key);
              }}
              onVisit={(card) => patchCard(card, "visit")}
              onAddToDeck={(card) => {
                if (!isLoggedIn) {
                  router.push(`/auth/login?redirect=${loginRedirect ?? deck.href}`);
                  return;
                }
                setAddKey(card.key);
              }}
              onPhoto={handlePhoto}
            />
          </div>
        </div>
      ) : null}

      {addKey ? (
        <AddToDeckDialog
          cardKey={addKey}
          onClose={() => setAddKey(null)}
          onAdded={() => setMessage("덱에 담았습니다.")}
        />
      ) : null}

      {message ? <p className="ooof-deck-msg">{message}</p> : null}
    </div>
  );
}
