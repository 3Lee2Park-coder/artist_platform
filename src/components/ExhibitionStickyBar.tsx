"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ExhibitionStickyBarProps = {
  exhibitionId: string;
  reservable: boolean;
  isLoggedIn: boolean;
  initialSaved: boolean;
};

export function ExhibitionStickyBar({
  exhibitionId,
  reservable,
  isLoggedIn,
  initialSaved
}: ExhibitionStickyBarProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggleSave() {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/exhibitions/${exhibitionId}`);
      return;
    }

    setPending(true);
    const response = await fetch("/api/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exhibitionId })
    });
    setPending(false);

    if (response.ok) {
      const data = await response.json();
      setSaved(Boolean(data.saved));
      router.refresh();
    }
  }

  function scrollToReservation() {
    const target = document.getElementById("reservation");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "RESERVATION_INTENT",
        exhibitionId,
        source: "sticky_bar"
      })
    }).catch(() => undefined);
  }

  return (
    <div className="detail-sticky-bar">
      <button
        type="button"
        className={saved ? "sticky-save active" : "sticky-save"}
        onClick={toggleSave}
        disabled={pending}
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        {saved ? "저장됨" : "저장"}
      </button>
      {reservable ? (
        <button type="button" className="primary-button sticky-reserve" onClick={scrollToReservation}>
          예약하기
        </button>
      ) : (
        <span className="sticky-note">현장 방문 · 문의 후 관람</span>
      )}
    </div>
  );
}
