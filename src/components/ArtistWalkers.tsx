"use client";

import { AskArtistDialog } from "@/components/AskArtistDialog";
import type { HomeWalker } from "@/lib/walkers";
import { useMemo, useState } from "react";

const KKIKKORI_AVATAR = "/brand/kkikkori-avatar.webp";

type ArtistWalkersProps = {
  walkers: HomeWalker[];
};

export function ArtistWalkers({ walkers }: ArtistWalkersProps) {
  const [active, setActive] = useState<HomeWalker | null>(null);
  const [unlisted, setUnlisted] = useState(false);

  const visible = useMemo(() => walkers.slice(0, 6), [walkers]);

  return (
    <>
      {visible.length > 0 ? (
        <div className="walker-layer" aria-hidden={false}>
          {visible.map((walker, index) => (
            <button
              key={walker.id}
              type="button"
              className={`walker-orb walker-orb-${(index % 4) + 1}`}
              style={{ animationDelay: `${index * 1.4}s` }}
              onClick={() => {
                setUnlisted(false);
                setActive(walker);
              }}
              aria-label={`${walker.displayName}에게 질문하기`}
            >
              <span
                className="walker-face"
                style={{
                  backgroundImage: `url(${walker.imageUrl ?? KKIKKORI_AVATAR})`
                }}
              />
              {walker.usesMascot ? (
                <span className="walker-initial">{walker.initial}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <p className="walker-unlisted-link" id="ask-artists">
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setActive(null);
            setUnlisted(true);
          }}
        >
          찾는 작가가 목록에 없나요? OOOF.가 대신 물어볼게요
        </button>
      </p>

      {active || unlisted ? (
        <AskArtistDialog
          walker={active}
          unlisted={unlisted}
          onClose={() => {
            setActive(null);
            setUnlisted(false);
          }}
        />
      ) : null}
    </>
  );
}
