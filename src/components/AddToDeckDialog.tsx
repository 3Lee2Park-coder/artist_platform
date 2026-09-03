"use client";

import { DECK_MAX_CARDS } from "@/lib/cards";
import { useEffect, useState } from "react";

export type UserDeckSummary = {
  id: string;
  title: string;
  cardCount: number;
};

type AddToDeckDialogProps = {
  cardKey: string;
  onClose: () => void;
  onAdded: () => void;
};

export function AddToDeckDialog({ cardKey, onClose, onAdded }: AddToDeckDialogProps) {
  const [decks, setDecks] = useState<UserDeckSummary[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/my/decks")
      .then((response) => response.json())
      .then((data) => setDecks(data.decks ?? []))
      .catch(() => setError("덱 목록을 불러오지 못했습니다."));
  }, []);

  async function addTo(deckId: string) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/my/decks/${deckId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "카드를 담지 못했습니다.");
      return;
    }
    onAdded();
    onClose();
  }

  async function createAndAdd() {
    if (!title.trim()) {
      setError("덱 이름을 적어 주세요.");
      return;
    }
    setBusy(true);
    const created = await fetch("/api/my/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() })
    });
    const deck = await created.json();
    if (!created.ok) {
      setBusy(false);
      setError(deck.error ?? "덱을 만들지 못했습니다.");
      return;
    }
    await addTo(deck.deck.id);
  }

  return (
    <div className="ooof-dialog" role="dialog" aria-modal="true" aria-labelledby="ooof-add-deck-title">
      <button type="button" className="ooof-dialog-scrim" aria-label="닫기" onClick={onClose} />
      <div className="ooof-dialog-card">
        <h2 id="ooof-add-deck-title">덱에 담기</h2>
        <p>어느 덱에 이 카드를 담을까요?</p>
        <ul className="ooof-deck-pick">
          {decks.map((deck) => (
            <li key={deck.id}>
              <button
                type="button"
                disabled={busy || deck.cardCount >= DECK_MAX_CARDS}
                onClick={() => addTo(deck.id)}
              >
                <strong>{deck.title}</strong>
                <span>
                  {deck.cardCount} / {DECK_MAX_CARDS}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {decks.some((deck) => deck.cardCount >= DECK_MAX_CARDS) ? (
          <p className="ooof-dialog-warn">이 덱이 꽉 찼어요. 새 덱을 만들어볼까요?</p>
        ) : null}
        <label>
          + 새 덱 만들기
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="성수 토요일"
          />
        </label>
        {error ? <p className="ooof-dialog-warn">{error}</p> : null}
        <div className="ooof-dialog-actions">
          <button type="button" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="is-fill" disabled={busy} onClick={createAndAdd}>
            새 덱에 담기
          </button>
        </div>
      </div>
    </div>
  );
}
