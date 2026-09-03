"use client";

import { DeckExperience } from "@/components/DeckExperience";
import { OoofCard } from "@/components/OoofCard";
import type {
  CalendarDayItem,
  CalendarPickCard,
  CalendarPickDeck
} from "@/lib/calendar-archive";
import type { OoofDeck } from "@/lib/decks";
import { shareDeckLink } from "@/lib/share-deck";
import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarPayload = {
  today: string;
  month: string;
  weekend: { saturday: string; sunday: string; label: string };
  days: Record<string, CalendarDayItem[]>;
  savedCards: CalendarPickCard[];
  decks: CalendarPickDeck[];
  prevMonth: string;
  nextMonth: string;
};

type DayCalendarArchiveProps = {
  decks: OoofDeck[];
  isLoggedIn: boolean;
};

function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  return `${year}년 ${Number(month)}월`;
}

function dateLabel(ymd: string) {
  const [, month, day] = ymd.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function cellsForMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const startPad = first.getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(`${yearMonth}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DayCalendarArchive({ decks, isLoggedIn }: DayCalendarArchiveProps) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [picker, setPicker] = useState<"CARD" | "DECK" | null>(null);
  const [openDeck, setOpenDeck] = useState<OoofDeck | null>(null);
  const [openCard, setOpenCard] = useState<CalendarDayItem | null>(null);
  const [cardModel, setCardModel] = useState<OoofDeck["cards"][number] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(nextMonth = month) {
    const response = await fetch(`/api/my/calendar?month=${nextMonth}`);
    const payload = await response.json();
    if (response.ok && payload.user) {
      setData(payload);
      setMonth(payload.month);
    }
  }

  useEffect(() => {
    void load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cells = useMemo(() => cellsForMonth(month), [month]);
  const dayItems = openDate && data ? (data.days[openDate] ?? []) : [];
  const weekend = data?.weekend;

  useEffect(() => {
    if (!openDeck) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openDeck]);

  async function addItem(kind: "CARD" | "DECK", target: string) {
    if (!openDate) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/my/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        kind === "CARD"
          ? { date: openDate, kind, cardKey: target }
          : { date: openDate, kind, deckId: target }
      )
    });
    const payload = await response.json();
    setBusy(false);
    setPicker(null);
    if (!response.ok) {
      setMessage(payload.error ?? "담지 못했습니다.");
      return;
    }
    await load(month);
  }

  async function removeItem(id: string) {
    setBusy(true);
    await fetch(`/api/my/calendar?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusy(false);
    await load(month);
  }

  async function shareDay() {
    if (!openDate) return;
    setBusy(true);
    const response = await fetch("/api/my/calendar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: openDate })
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? "공유하지 못했습니다.");
      return;
    }
    const url = new URL(payload.path, window.location.origin).toString();
    const result = await shareDeckLink({
      title: `OOOF. ${dateLabel(openDate)} 코스`,
      url,
      text: `${dateLabel(openDate)}에 담아 둔 발견입니다.`
    });
    if (result === "copied") setMessage(`링크를 복사했습니다. ${url}`);
    else if (result === "shared") setMessage("공유했습니다.");
    else if (result === "manual") setMessage(`이 주소를 복사해 주세요. ${url}`);
  }

  async function inspectCard(item: CalendarDayItem) {
    if (!item.cardKey) {
      if (item.href) window.location.href = item.href;
      return;
    }
    const deck = decks.find((entry) => entry.cards.some((card) => card.key === item.cardKey));
    const found = deck?.cards.find((card) => card.key === item.cardKey);
    if (found) {
      setOpenCard(item);
      setCardModel(found);
      return;
    }
    setOpenCard(item);
    setCardModel(null);
  }

  function inspectDeck(item: CalendarDayItem) {
    if (!item.deckId) return;
    const deck = decks.find((entry) => entry.id === item.deckId) ?? null;
    if (deck) setOpenDeck(deck);
  }

  return (
    <section className="day-calendar" id="day-calendar">
      <header className="day-calendar-head">
        <p className="eyebrow">DAY ARCHIVE</p>
        <h2>날짜에 담아 두는 발견</h2>
        <p>
          다녀온 날은 사진이 달력을 채우고, {weekend?.label ?? "다음 주말"} 데이트 코스는
          미리 카드와 덱을 올려 둘 수 있습니다. 홈에서 주말 코스를 다시 열어보세요.
        </p>
      </header>

      {weekend ? (
        <div className="day-calendar-weekend">
          <strong>{weekend.label}</strong>
          <button type="button" onClick={() => setOpenDate(weekend.saturday)}>
            토 {weekend.saturday.slice(8)}일
          </button>
          <button type="button" onClick={() => setOpenDate(weekend.sunday)}>
            일 {weekend.sunday.slice(8)}일
          </button>
        </div>
      ) : null}

      <div className="day-calendar-nav">
        <button
          type="button"
          onClick={() => {
            const next = data?.prevMonth;
            if (next) void load(next);
          }}
        >
          이전 달
        </button>
        <strong>{monthLabel(month)}</strong>
        <button
          type="button"
          onClick={() => {
            const next = data?.nextMonth;
            if (next) void load(next);
          }}
        >
          다음 달
        </button>
      </div>

      <div className="day-calendar-weekdays">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="day-calendar-grid">
        {cells.map((date, index) => {
          if (!date) return <div key={`pad-${index}`} className="day-calendar-cell is-empty" />;
          const items = data?.days[date] ?? [];
          const cover = items.find((item) => item.imageUrl)?.imageUrl;
          const isToday = data?.today === date;
          const isWeekend =
            weekend && (date === weekend.saturday || date === weekend.sunday);
          return (
            <button
              key={date}
              type="button"
              className={`day-calendar-cell${items.length ? " has-item" : ""}${isToday ? " is-today" : ""}${isWeekend ? " is-weekend" : ""}`}
              onClick={() => setOpenDate(date)}
              style={
                cover
                  ? { backgroundImage: `url(${cover})` }
                  : items[0]?.tone
                    ? { background: items[0].tone }
                    : undefined
              }
            >
              <span>{Number(date.slice(8))}</span>
              {items.length > 1 ? <em>{items.length}</em> : null}
            </button>
          );
        })}
      </div>

      {openDate ? (
        <div className="day-calendar-sheet" role="dialog" aria-modal="true">
          <button type="button" className="ooof-dialog-scrim" onClick={() => setOpenDate(null)} />
          <div className="day-calendar-sheet-card">
            <header>
              <p className="eyebrow">{dateLabel(openDate)}</p>
              <h3>이 날의 코스</h3>
            </header>
            {dayItems.length === 0 ? (
              <p className="auth-description">아직 비어 있습니다. 카드나 덱을 올려 코스를 만들어 보세요.</p>
            ) : (
              <ul className="day-calendar-list">
                {dayItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="day-calendar-entry"
                      onClick={() =>
                        item.kind === "DECK" ? inspectDeck(item) : void inspectCard(item)
                      }
                    >
                      <span
                        className="day-calendar-thumb"
                        style={
                          item.imageUrl
                            ? { backgroundImage: `url(${item.imageUrl})` }
                            : item.tone
                              ? { background: item.tone }
                              : undefined
                        }
                      />
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.kind === "DECK" ? "덱 · 펼쳐보기" : item.locked ? "다녀온 기록" : "카드"}
                        </small>
                      </span>
                    </button>
                    {item.locked ? null : (
                      <button
                        type="button"
                        className="day-calendar-remove"
                        disabled={busy}
                        onClick={() => void removeItem(item.id)}
                      >
                        빼기
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="day-calendar-actions">
              <button type="button" onClick={() => setPicker("CARD")} disabled={busy}>
                카드 담기
              </button>
              <button type="button" onClick={() => setPicker("DECK")} disabled={busy}>
                덱 담기
              </button>
              <button type="button" className="ooof-btn-fill" onClick={() => void shareDay()} disabled={busy}>
                이 날 공유
              </button>
            </div>
            {picker === "CARD" ? (
              <div className="day-calendar-picker">
                <p>저장해 둔 카드</p>
                {(data?.savedCards ?? []).length === 0 ? (
                  <p>아직 담아 둔 카드가 없습니다. 카드를 저장한 뒤 날짜에 올려 보세요.</p>
                ) : (
                  <ul>
                    {data?.savedCards.map((card) => (
                      <li key={card.key}>
                        <button type="button" disabled={busy} onClick={() => void addItem("CARD", card.key)}>
                          {card.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            {picker === "DECK" ? (
              <div className="day-calendar-picker">
                <p>나의 덱</p>
                {(data?.decks ?? []).length === 0 ? (
                  <p>먼저 아래쪽에서 덱을 만들어 주세요.</p>
                ) : (
                  <ul>
                    {data?.decks.map((deck) => (
                      <li key={deck.id}>
                        <button type="button" disabled={busy} onClick={() => void addItem("DECK", deck.id)}>
                          {deck.title} · {deck.cardCount}장
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            {message ? <p className="ooof-my-feedback">{message}</p> : null}
            <button type="button" className="day-calendar-close" onClick={() => setOpenDate(null)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}

      {openDeck ? (
        <div className="day-calendar-deck-stage">
          <DeckExperience
            deck={openDeck}
            isLoggedIn={isLoggedIn}
            defaultOpen
            loginRedirect="/my"
            onClose={() => setOpenDeck(null)}
          />
        </div>
      ) : null}

      {openCard ? (
        <div className="ooof-card-inspect">
          <button type="button" className="ooof-dialog-scrim" onClick={() => setOpenCard(null)} />
          <div className="ooof-card-inspect-stage">
            <button type="button" className="ooof-inspect-back" onClick={() => setOpenCard(null)}>
              달력으로
            </button>
            {cardModel ? (
              <OoofCard card={cardModel} />
            ) : (
              <p>
                {openCard.title}
                {openCard.href ? (
                  <>
                    {" · "}
                    <a href={openCard.href}>찾아가기</a>
                  </>
                ) : null}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
