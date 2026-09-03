"use client";

import {
  DOSIRAK_BRAND,
  dosirakEditorialLine,
  dosirakPicks,
  dosirakSlotLabel,
  type Dosirak,
  type DosirakCompartment
} from "@/lib/dosirak";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

export type DosirakObjectSize = "shelf" | "home" | "detail";

type DosirakObjectProps = {
  dosirak: Dosirak;
  defaultOpen?: boolean;
  size?: DosirakObjectSize;
  peekable?: boolean;
  /** 진열대에서 닫힌 상품을 고를 때 */
  onActivate?: () => void;
};

const CELL_TONES = ["#F4F2EC", "#E4E8E1", "#EBE4DC", "#E1E5E8", "#EAE6E1"];

function cellTone(index: number, fallback: string | null) {
  return fallback && !fallback.startsWith("linear")
    ? fallback
    : CELL_TONES[index % CELL_TONES.length];
}

function Cell({
  item,
  index,
  isMain,
  compact,
  onClick
}: {
  item: DosirakCompartment;
  index: number;
  isMain: boolean;
  compact?: boolean;
  onClick?: (item: DosirakCompartment) => void;
}) {
  return (
    <button
      type="button"
      className={
        isMain
          ? "dk-cell dk-cell-main"
          : compact
            ? "dk-cell dk-cell-side is-compact"
            : "dk-cell dk-cell-side"
      }
      style={{ background: cellTone(index, item.tone) }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item);
      }}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="dk-cell-photo" src={item.imageUrl} alt="" />
      ) : null}
      <span className="dk-cell-shade" aria-hidden="true" />
      <span className="dk-cell-top">
        <span className="dk-cell-slot">{dosirakSlotLabel(index)}</span>
      </span>
      <span className="dk-cell-copy">
        {isMain ? (
          <>
            <span className="dk-cell-cat">{item.typeLabel}</span>
            <span className="dk-cell-title">
              {item.artist || item.title}
            </span>
            {item.artist ? (
              <span className="dk-cell-sub">{item.title}</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="dk-cell-title">{item.typeLabel}</span>
            <span className="dk-cell-sub">{item.title}</span>
          </>
        )}
      </span>
    </button>
  );
}

function Bed({
  picks,
  onPeek
}: {
  picks: DosirakCompartment[];
  onPeek?: (item: DosirakCompartment) => void;
}) {
  const n = picks.length;
  const main = picks[0];
  const sides = picks.slice(1);

  if (!main) return <div className="dk-bed" />;

  if (n === 1) {
    return (
      <div className="dk-bed" data-picks="1">
        <Cell item={main} index={0} isMain onClick={onPeek} />
      </div>
    );
  }

  if (n === 6) {
    return (
      <div className="dk-bed" data-picks="6">
        <div className="dk-main">
          <Cell item={main} index={0} isMain onClick={onPeek} />
        </div>
        <div className="dk-sides">
          <div className="dk-sides-row dk-sides-row-2">
            {sides.slice(0, 2).map((item, index) => (
              <Cell
                key={item.key}
                item={item}
                index={index + 1}
                isMain={false}
                onClick={onPeek}
              />
            ))}
          </div>
          <div className="dk-sides-row dk-sides-row-3">
            {sides.slice(2).map((item, index) => (
              <Cell
                key={item.key}
                item={item}
                index={index + 3}
                isMain={false}
                compact
                onClick={onPeek}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dk-bed" data-picks={String(n)}>
      <div className="dk-main">
        <Cell item={main} index={0} isMain onClick={onPeek} />
      </div>
      <div className="dk-sides">
        {sides.map((item, index) => (
          <Cell
            key={item.key}
            item={item}
            index={index + 1}
            isMain={false}
            compact={n >= 7}
            onClick={onPeek}
          />
        ))}
      </div>
    </div>
  );
}

function PeekModal({
  item,
  onClose
}: {
  item: DosirakCompartment;
  onClose: () => void;
}) {
  const isMain = item.role === "rice";
  const heading = isMain && item.artist ? item.artist : item.title;
  const sub = isMain && item.artist ? item.title : item.subtitle;
  const body = (item.note || "").trim() || (item.subtitle && item.subtitle !== item.typeLabel
    ? item.subtitle
    : "");
  const href = item.href || item.externalUrl;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="dk-peek" role="dialog" aria-modal="true" aria-labelledby="dk-peek-title">
      <button type="button" className="dk-peek-scrim" aria-label="닫기" onClick={onClose} />
      <div className="dk-peek-card">
        {item.imageUrl ? (
          <div className="dk-peek-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="" />
          </div>
        ) : (
          <div
            className="dk-peek-media"
            style={{ background: item.tone ?? "#EBE9E4" }}
          />
        )}
        <div className="dk-peek-body">
          <button type="button" className="dk-peek-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
          <p className="dk-peek-kicker">
            <span>{item.typeLabel}</span>
            {item.distanceText ? <span>{item.distanceText}</span> : null}
            {item.ended ? <span>전시 마감</span> : null}
          </p>
          <h2 id="dk-peek-title">{heading}</h2>
          {sub && sub !== heading ? <p className="dk-peek-sub">{sub}</p> : null}
          {body ? <p className="dk-peek-note">{body}</p> : null}
          {href ? (
            <div className="dk-peek-actions">
              {item.href ? (
                <Link className="dk-peek-go" href={item.href}>
                  이 곳 보기
                </Link>
              ) : (
                <a
                  className="dk-peek-go"
                  href={item.externalUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  이 곳 보기
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Utensils() {
  return (
    <div className="dk-utensils" aria-hidden="true">
      <span className="dk-chopstick" />
      <span className="dk-chopstick" />
      <span className="dk-spoon">
        <span />
      </span>
    </div>
  );
}

export function DosirakObject({
  dosirak,
  defaultOpen = false,
  size = "home",
  peekable = true,
  onActivate
}: DosirakObjectProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [peek, setPeek] = useState<DosirakCompartment | null>(null);
  const labelId = useId();
  const picks = dosirakPicks(dosirak);
  const editorial = open ? dosirakEditorialLine(dosirak) : null;
  const isShelf = size === "shelf";
  const shownOpen = isShelf ? false : open;

  function handleBoxClick() {
    if (isShelf) {
      onActivate?.();
      return;
    }
    if (!shownOpen) setOpen(true);
  }

  return (
    <div className={`dk-product is-${size}${shownOpen ? " is-open" : " is-closed"}`}>
      <div
        className="dk-stage"
        role={isShelf || !shownOpen ? "button" : undefined}
        tabIndex={isShelf || !shownOpen ? 0 : undefined}
        aria-labelledby={labelId}
        onClick={handleBoxClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleBoxClick();
          }
        }}
      >
        <div className="dk-shadow" aria-hidden="true" />
        <Utensils />

        <div className="dk-tray" {...(shownOpen ? {} : { inert: true })}>
          {isShelf ? (
            <div className="dk-bed dk-bed-empty" />
          ) : (
            <Bed picks={picks} onPeek={peekable && shownOpen ? setPeek : undefined} />
          )}
        </div>

        <div className="dk-lid">
          <span className="dk-lid-grain" aria-hidden="true" />
          <span className="dk-lid-frame" aria-hidden="true" />
          <div className="dk-lid-inner">
            <span className="dk-lid-rule" aria-hidden="true" />
            <p className="dk-lid-kicker">
              {DOSIRAK_BRAND.unit} {dosirak.number}
            </p>
            <h3 className="dk-lid-title" id={labelId}>
              {dosirak.title}
            </h3>
            <p className="dk-lid-meta">
              {dosirak.neighborhood ? <span>{dosirak.neighborhood}</span> : null}
              <span>{picks.length}곳</span>
            </p>
            {isShelf ? null : (
              <p className="dk-lid-hint">눌러서 열기</p>
            )}
          </div>
        </div>
      </div>

      {editorial ? <p className="dk-editorial">{editorial}</p> : null}

      {size === "home" ? (
        <div className="dk-product-actions">
          {shownOpen ? (
            <button type="button" className="dk-toggle" onClick={() => setOpen(false)}>
              뚜껑 닫기
            </button>
          ) : (
            <button type="button" className="dk-toggle" onClick={() => setOpen(true)}>
              도시락 열기
            </button>
          )}
          <Link className="dk-detail-link" href={dosirak.href}>
            지도와 동선
          </Link>
        </div>
      ) : null}

      {peek ? <PeekModal item={peek} onClose={() => setPeek(null)} /> : null}
    </div>
  );
}
