"use client";

import { DayCalendarArchive } from "@/components/DayCalendarArchive";
import { DeckStack } from "@/components/DeckStack";
import type { OoofDeck } from "@/lib/decks";
import { shareDeckLink } from "@/lib/share-deck";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MyDecksPanelProps = {
  decks: OoofDeck[];
  isLoggedIn?: boolean;
};

export function MyDecksPanel({ decks, isLoggedIn = true }: MyDecksPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decksOpen, setDecksOpen] = useState(false);

  async function createDeck() {
    setMessage("");
    const response = await fetch("/api/my/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || "나의 덱" })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "덱을 만들지 못했습니다.");
      return;
    }
    setTitle("");
    router.refresh();
  }

  async function shareDeck(deck: OoofDeck) {
    setBusyId(deck.id);
    setMessage("");
    const response = await fetch(`/api/my/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ makePublic: true })
    });
    const data = await response.json();
    setBusyId(null);
    if (!response.ok) {
      setMessage(data.error ?? "공유 링크를 만들지 못했습니다.");
      return;
    }
    const path = `/share/decks/${data.deck.shareToken}`;
    const url = new URL(path, window.location.origin).toString();
    const result = await shareDeckLink({
      title: `OOOF. ${deck.title}`,
      url,
      text: `${deck.createdByLabel}님이 묶어 둔 덱 · ${deck.title} · ${deck.cardCount}장`
    });
    if (result === "copied") {
      setMessage(`링크를 복사했습니다. ${url}`);
    } else if (result === "shared") {
      setMessage("공유했습니다. 받은 사람은 가입 없이 펼쳐진 덱을 볼 수 있습니다.");
    } else if (result === "manual") {
      setMessage(`자동 복사가 막혀 있습니다. 이 주소를 직접 복사해 주세요. ${url}`);
    }
  }

  async function deleteDeck(deck: OoofDeck) {
    if (
      !window.confirm(
        `「${deck.title}」 덱을 삭제할까요? 카드 자체는 남아 있고, 이 묶음만 사라집니다.`
      )
    ) {
      return;
    }
    setBusyId(deck.id);
    const response = await fetch(`/api/my/decks/${deck.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(data.error ?? "덱을 삭제하지 못했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="ooof-my-decks">
      <DayCalendarArchive decks={decks} isLoggedIn={isLoggedIn} />

      <button
        type="button"
        className="ooof-my-decks-toggle"
        aria-expanded={decksOpen}
        onClick={() => setDecksOpen((open) => !open)}
      >
        <span>
          <p className="eyebrow">MY DECKS</p>
          <strong>묶어 둔 덱</strong>
          <em>{decks.length}개</em>
        </span>
        <span className="ooof-my-decks-toggle-arrow" aria-hidden="true">
          ›
        </span>
      </button>
      {decksOpen ? (
        <>
          <p className="ooof-my-decks-list-lead">
            달력의 하루에 올릴 묶음입니다. 카드 여러 장을 코스로 모아 두세요.
          </p>
          {decks.length === 0 ? (
            <p>아직 덱이 없습니다. 아래에서 이름을 정하고 카드를 담아 보세요.</p>
          ) : (
            <ul className="ooof-my-deck-compact">
              {decks.map((deck) => (
                <li key={deck.id}>
                  <DeckStack deck={deck} href={deck.href} size="shelf" />
                  <div>
                    <strong>{deck.title}</strong>
                    <span>{deck.cardCount}장</span>
                    <div className="ooof-my-deck-actions">
                      <button
                        type="button"
                        className="ooof-share-btn"
                        disabled={busyId === deck.id}
                        onClick={() => shareDeck(deck)}
                      >
                        공유하기
                      </button>
                      <button
                        type="button"
                        className="ooof-delete-btn"
                        disabled={busyId === deck.id}
                        onClick={() => deleteDeck(deck)}
                      >
                        덱 삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="ooof-my-create">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="성수 토요일"
            />
            <button type="button" className="ooof-btn-fill" onClick={createDeck}>
              새 덱 만들기
            </button>
          </div>
        </>
      ) : null}
      {message ? <p className="ooof-my-feedback">{message}</p> : null}
    </section>
  );
}
