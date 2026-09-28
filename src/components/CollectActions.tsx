"use client";

import { AddToDeckDialog } from "@/components/AddToDeckDialog";
import { trackProductEvent } from "@/lib/client-analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type CollectActionsProps = {
  cardKey: string;
  isLoggedIn: boolean;
  loginRedirect: string;
  initialSaved?: boolean;
  showSave?: boolean;
};

function todayKst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function contentFromCardKey(cardKey: string) {
  const [contentType, contentId] = cardKey.split(":", 2);
  return {
    contentType: contentType || "card",
    contentId: contentId || cardKey,
    cardKey
  };
}

export function CollectActions({
  cardKey,
  isLoggedIn,
  loginRedirect,
  initialSaved = false,
  showSave = true
}: CollectActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [deckOpen, setDeckOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [date, setDate] = useState(todayKst);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const login = useMemo(
    () => `/auth/login?redirect=${encodeURIComponent(loginRedirect)}`,
    [loginRedirect]
  );
  const content = useMemo(() => contentFromCardKey(cardKey), [cardKey]);

  function requireLogin(intent: "save" | "deck" | "calendar") {
    if (intent === "save") {
      void trackProductEvent({
        type: "SAVE_INTENT",
        source: "collect_actions",
        gaOnly: true,
        metadata: content
      });
    }
    router.push(login);
  }

  async function saveCard() {
    if (!isLoggedIn) {
      requireLogin("save");
      return;
    }
    if (saved) {
      setMessage("이미 내 카드에 있습니다. MY 달력에서 날짜에 올릴 수 있습니다.");
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/cards/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey, action: "save" })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "카드를 저장하지 못했습니다.");
      return;
    }
    setSaved(true);
    void trackProductEvent({
      type: "SAVE",
      source: "collect_actions",
      gaOnly: true,
      metadata: content
    });
    setMessage("내 카드에 담았습니다. MY 달력의 「카드 담기」에서 날짜에 올릴 수 있습니다.");
  }

  function openDeck() {
    if (!isLoggedIn) {
      requireLogin("deck");
      return;
    }
    setDeckOpen(true);
  }

  async function addToCalendar() {
    if (!isLoggedIn) {
      requireLogin("calendar");
      return;
    }
    if (!date) {
      setMessage("날짜를 골라 주세요.");
      return;
    }
    setBusy(true);
    setMessage("");
    if (!saved) {
      const save = await fetch("/api/cards/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardKey, action: "save" })
      });
      if (save.ok) {
        setSaved(true);
        void trackProductEvent({
          type: "SAVE",
          source: "collect_calendar",
          gaOnly: true,
          metadata: content
        });
      }
    }
    const response = await fetch("/api/my/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, kind: "CARD", cardKey })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "달력에 올리지 못했습니다.");
      return;
    }
    setMessage("MY 달력에 올렸습니다. 그날 코스에서 확인할 수 있습니다.");
  }

  return (
    <div className="collect-actions">
      <p className="collect-actions-hint">
        <strong>카드 저장</strong>은 MY 달력에 올릴 한 장이고,{" "}
        <strong>내 덱에 넣기</strong>는 여러 장을 코스로 묶습니다.
      </p>
      <div className="collect-actions-row">
        {showSave ? (
          <button type="button" className={saved ? "is-on" : ""} onClick={() => void saveCard()} disabled={busy}>
            {saved ? "카드 저장됨" : "카드 저장"}
          </button>
        ) : null}
        <button type="button" className="is-fill" onClick={openDeck} disabled={busy}>
          내 덱에 넣기
        </button>
        <button type="button" onClick={() => setCalOpen((open) => !open)} disabled={busy}>
          달력에 올리기
        </button>
      </div>
      {calOpen ? (
        <div className="collect-cal">
          <label>
            날짜
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button type="button" className="is-fill" onClick={() => void addToCalendar()} disabled={busy}>
            이 날 올리기
          </button>
          <Link href="/my#day-calendar">MY 달력 보기</Link>
        </div>
      ) : null}
      {message ? <p className="collect-actions-msg">{message}</p> : null}
      {deckOpen ? (
        <AddToDeckDialog
          cardKey={cardKey}
          onClose={() => setDeckOpen(false)}
          onAdded={() =>
            setMessage("내 덱에 넣었습니다. MY 달력의 「덱 담기」에서 날짜에 올릴 수 있습니다.")
          }
        />
      ) : null}
    </div>
  );
}
