"use client";

import { DeckExperience } from "@/components/DeckExperience";
import { DECK_MAX_CARDS } from "@/lib/cards";
import type { OoofDeck } from "@/lib/decks";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MyDeckEditorProps = {
  deck: OoofDeck;
  isLoggedIn: boolean;
};

export function MyDeckEditor({ deck, isLoggedIn }: MyDeckEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(deck.title);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveTitle() {
    setBusy(true);
    const response = await fetch(`/api/my/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || deck.title })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "제목을 바꾸지 못했습니다.");
      return;
    }
    setMessage("제목을 저장했습니다.");
    router.refresh();
  }

  async function removeCard(cardKey: string) {
    setBusy(true);
    const response = await fetch(
      `/api/my/decks/${deck.id}/cards?cardKey=${encodeURIComponent(cardKey)}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "카드를 빼지 못했습니다.");
      return;
    }
    router.refresh();
  }

  async function move(index: number, delta: number) {
    const keys = deck.cards.map((card) => card.key);
    const next = index + delta;
    if (next < 0 || next >= keys.length) return;
    [keys[index], keys[next]] = [keys[next], keys[index]];
    setBusy(true);
    const response = await fetch(`/api/my/decks/${deck.id}/cards`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKeys: keys })
    });
    setBusy(false);
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "순서를 바꾸지 못했습니다.");
      return;
    }
    router.refresh();
  }

  async function deleteDeck() {
    if (
      !window.confirm(
        `「${deck.title}」 덱을 삭제할까요? 카드 자체는 남아 있고, 이 묶음만 사라집니다.`
      )
    ) {
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/my/decks/${deck.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "덱을 삭제하지 못했습니다.");
      return;
    }
    router.push("/my");
    router.refresh();
  }

  return (
    <div className="ooof-my-editor">
      <div className="ooof-my-editor-bar">
        <label>
          CHANGE TITLE
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <button type="button" className="ooof-btn-fill" disabled={busy} onClick={saveTitle}>
          저장
        </button>
        <button type="button" className="ooof-delete-btn" disabled={busy} onClick={deleteDeck}>
          DELETE DECK
        </button>
        <p>
          {deck.cardCount} / {DECK_MAX_CARDS}
        </p>
      </div>
      {deck.cardCount === 0 ? (
        <p className="auth-description">
          아직 카드가 없습니다. 덱을 연 뒤 카드를 ADD TO DECK로 담아 보세요.
        </p>
      ) : null}
      <DeckExperience deck={deck} isLoggedIn={isLoggedIn} />
      {deck.cards.length > 0 ? (
        <ul className="ooof-my-edit-list">
          {deck.cards.map((card, index) => (
            <li key={card.key}>
              <span>{card.name}</span>
              <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                위로
              </button>
              <button
                type="button"
                disabled={busy || index === deck.cards.length - 1}
                onClick={() => move(index, 1)}
              >
                아래로
              </button>
              <button type="button" disabled={busy} onClick={() => removeCard(card.key)}>
                REMOVE CARD
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
