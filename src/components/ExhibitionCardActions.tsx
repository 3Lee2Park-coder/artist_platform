"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ExhibitionCardActionsProps = {
  exhibitionId: string;
  initialSaved?: boolean;
  initialVisited?: boolean;
  variant?: "stack" | "inline";
};

export function ExhibitionCardActions({
  exhibitionId,
  initialSaved = false,
  initialVisited = false,
  variant = "stack"
}: ExhibitionCardActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [visited, setVisited] = useState(initialVisited);
  const [pending, setPending] = useState(false);

  async function toggle(
    endpoint: "/api/saves" | "/api/visits",
    apply: (value: boolean) => void,
    key: "saved" | "visited"
  ) {
    if (pending) return;
    setPending(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exhibitionId })
      });

      if (response.status === 401) {
        router.push(`/auth/login?redirect=/exhibitions/${exhibitionId}`);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        apply(Boolean(data[key]));
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={variant === "inline" ? "card-actions inline" : "card-actions"}>
      <button
        type="button"
        className={saved ? "card-action-btn active" : "card-action-btn"}
        aria-pressed={saved}
        aria-label={saved ? "저장 취소" : "저장하기"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle("/api/saves", setSaved, "saved");
        }}
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        저장
      </button>
      <button
        type="button"
        className={visited ? "card-action-btn active" : "card-action-btn"}
        aria-pressed={visited}
        aria-label={visited ? "방문 기록 취소" : "다녀왔어요"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle("/api/visits", setVisited, "visited");
        }}
      >
        <span aria-hidden="true">{visited ? "✓" : "＋"}</span>
        다녀옴
      </button>
    </div>
  );
}
