"use client";

import { AskArtistTrigger } from "@/components/AskArtistDialog";
import { displayImage, type OoofCard } from "@/lib/cards";
import Link from "next/link";
import { useRef, useState } from "react";

type OoofCardProps = {
  card: OoofCard;
  flipped?: boolean;
  onFlip?: (next: boolean) => void;
  onSave?: (card: OoofCard) => void;
  onVisit?: (card: OoofCard) => void;
  onAddToDeck?: (card: OoofCard) => void;
  onPhoto?: (card: OoofCard, file: File) => void;
  catalog?: boolean;
  compact?: boolean;
};

function rarityClass(rarity: OoofCard["rarity"]) {
  return `ooof-rarity is-${rarity.toLowerCase()}`;
}

const KIND_LABEL: Record<OoofCard["kind"], string> = {
  ARTIST: "작가",
  EXHIBITION: "전시",
  PLACE: "장소"
};

export function OoofCard({
  card,
  flipped = false,
  onFlip,
  onSave,
  onVisit,
  onAddToDeck,
  onPhoto,
  compact = false,
  catalog = false
}: OoofCardProps) {
  const [localFlip, setLocalFlip] = useState(false);
  const isFlipped = onFlip ? flipped : localFlip;
  const fileRef = useRef<HTMLInputElement>(null);
  const image = displayImage(card);
  const visitedLabel = card.visitedAt
    ? card.visitedAt.slice(0, 10).replaceAll("-", ".")
    : null;

  function toggle(event?: React.MouseEvent) {
    event?.stopPropagation();
    const next = !isFlipped;
    if (onFlip) onFlip(next);
    else setLocalFlip(next);
  }

  return (
    <div className={`ooof-card-3d${compact ? " is-compact" : ""}${catalog ? " is-catalog" : ""}`}>
      <div className={`ooof-card-inner${isFlipped ? " is-flipped" : ""}`}>
        <div
          className="ooof-card-face ooof-card-front"
          role={compact ? undefined : "button"}
          tabIndex={compact ? undefined : 0}
          onClick={compact ? undefined : () => toggle()}
          onKeyDown={
            compact
              ? undefined
              : (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle();
                  }
                }
          }
          aria-label={compact ? undefined : `${card.name} 카드 뒤집기. 뒷면에 고른 이유가 있습니다.`}
        >
          <span className="ooof-card-top">
            <span className="ooof-card-type">{KIND_LABEL[card.kind]}</span>
            <span className={rarityClass(card.rarity)}>{card.rarity}</span>
          </span>
          <span className="ooof-card-photo">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" />
            ) : (
              <span className="ooof-card-photo-empty" style={{ background: card.tone ?? "#E8E2D9" }} />
            )}
            {card.visited ? <span className="ooof-visited-stamp">다녀옴</span> : null}
            {card.visitedPhotoUrl ? (
              <span className="ooof-myphoto-badge">내 사진{visitedLabel ? ` · ${visitedLabel}` : ""}</span>
            ) : null}
          </span>
          <span className="ooof-card-name-row">
            <strong title={card.name}>{card.name}</strong>
            {card.location ? <span title={card.location}>{card.location}</span> : null}
          </span>
          {card.oofNote ? <em className="ooof-card-note">“{card.oofNote}”</em> : null}
          <span className="ooof-card-kick">
            {card.bestTime ? (
              <span>
                이 시간에 <b>{card.bestTime}</b>
              </span>
            ) : (
              <span>
                종류 <b>{card.categoryLabel}</b>
              </span>
            )}
            {card.goodFor ? (
              <span>
                이럴 때 <b>{card.goodFor}</b>
              </span>
            ) : (
              <span>
                카드 <b>{card.number}</b>
              </span>
            )}
          </span>
          {compact ? null : (
            <span className="ooof-flip-hint">
              눌러서 뒤집기
              <i aria-hidden="true">↕</i>
            </span>
          )}
        </div>

        <div className="ooof-card-face ooof-card-back">
          <button type="button" className="ooof-card-back-head" onClick={toggle}>
            <span>뒷면</span>
            <span>앞면 보기</span>
          </button>
          {card.whyPicked ? (
            <div className="ooof-card-block">
              <h4>왜 골랐나</h4>
              <p>“{card.whyPicked}”</p>
            </div>
          ) : null}
          {card.oofFact ? (
            <div className="ooof-card-fact">
              <span>OOOF. 한 줄</span>
              <p>{card.oofFact}</p>
            </div>
          ) : null}
          <dl className="ooof-card-meta">
            {card.address ? (
              <>
                <dt>위치</dt>
                <dd>{card.address}</dd>
              </>
            ) : null}
            {card.openingHours ? (
              <>
                <dt>시간</dt>
                <dd>{card.openingHours}</dd>
              </>
            ) : null}
            {card.mood ? (
              <>
                <dt>분위기</dt>
                <dd>{card.mood}</dd>
              </>
            ) : null}
            {card.bestTime ? (
              <>
                <dt>이 시간에</dt>
                <dd>{card.bestTime}</dd>
              </>
            ) : null}
            {card.goodFor ? (
              <>
                <dt>이럴 때</dt>
                <dd>{card.goodFor}</dd>
              </>
            ) : null}
            {card.artistName ? (
              <>
                <dt>작가</dt>
                <dd>{card.artistName}</dd>
              </>
            ) : null}
          </dl>
          <div className="ooof-card-actions">
            {onSave ? (
              <button type="button" className={card.saved ? "is-on" : ""} onClick={() => onSave(card)}>
                {card.saved ? "담김" : "담기"}
              </button>
            ) : null}
            {onVisit ? (
              <button type="button" className={card.visited ? "is-on" : ""} onClick={() => onVisit(card)}>
                다녀왔어요
              </button>
            ) : null}
            {card.visited && onPhoto ? (
              <>
                <button type="button" onClick={() => fileRef.current?.click()}>
                  내 사진 넣기
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onPhoto(card, file);
                    event.target.value = "";
                  }}
                />
              </>
            ) : null}
            {onAddToDeck ? (
              <button type="button" className="is-fill" onClick={() => onAddToDeck(card)}>
                덱에 담기
              </button>
            ) : null}
            {card.source === "place" ? null : (
              <AskArtistTrigger
                className="ooof-card-go"
                target={{
                  artistId: card.artistId,
                  artistName: card.artistName ?? card.name,
                  exhibitionId: card.exhibitionId,
                  imageUrl: card.kind === "ARTIST" ? card.imageUrl : null
                }}
              />
            )}
            {card.href ? (
              <Link href={card.href} className="ooof-card-go">
                찾아가기
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
