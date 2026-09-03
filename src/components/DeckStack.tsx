"use client";

import type { OoofDeck } from "@/lib/decks";
import Link from "next/link";

type DeckStackProps = {
  deck: OoofDeck;
  onOpen?: () => void;
  href?: string;
  size?: "shelf" | "hero";
};

export function DeckStack({ deck, onOpen, href, size = "shelf" }: DeckStackProps) {
  const layers = Math.min(7, Math.max(4, deck.cardCount || 4));
  const className = `ooof-deck-stack is-${size}`;
  const label = `${deck.title}, ${deck.cardCount}장의 카드. 덱 열기`;

  const body = (
    <>
      {Array.from({ length: layers - 1 }, (_, index) => (
        <span
          key={index}
          className={`ooof-deck-layer layer-${index + 1}`}
          style={{
            ["--layer-x" as string]: `${(index % 2 === 0 ? -1 : 1) * (5 + index * 2.4)}px`,
            ["--layer-y" as string]: `${8 + index * 5}px`,
            ["--layer-r" as string]: `${(index % 2 === 0 ? -1 : 1) * (1.1 + index * 0.7)}deg`
          }}
          aria-hidden="true"
        />
      ))}
      <span className="ooof-deck-cover" style={{ ["--deck-accent" as string]: deck.accentColor }}>
        <span className="ooof-deck-cover-top">
          <b>OOOF. DECK</b>
          <span>
            {deck.number}
            {deck.location ? ` / ${deck.location}` : ""}
          </span>
        </span>
        <span className="ooof-deck-cover-mid">
          {deck.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deck.coverImageUrl} alt="" />
          ) : (
            <span className="ooof-deck-cover-empty" />
          )}
          <span>
            <strong>{deck.title}</strong>
            <em>{deck.cardCount} CARDS</em>
          </span>
        </span>
        <span className="ooof-deck-cover-foot">
          <span>{deck.isCurated ? "OOOF.가 묶음" : "나의 덱"}</span>
          <span>덱 열기</span>
        </span>
      </span>
    </>
  );

  if (href && !onOpen) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onOpen} aria-label={label}>
      {body}
    </button>
  );
}
