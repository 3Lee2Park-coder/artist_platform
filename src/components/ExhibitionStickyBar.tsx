"use client";

import { trackProductEvent } from "@/lib/client-analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ExhibitionStickyBarProps = {
  exhibitionId: string;
  reservable: boolean;
  isLoggedIn: boolean;
  initialSaved: boolean;
  courseHref?: string | null;
  courseLabel?: string | null;
  courseId?: string | null;
};

export function ExhibitionStickyBar({
  exhibitionId,
  reservable,
  isLoggedIn,
  initialSaved,
  courseHref,
  courseLabel,
  courseId
}: ExhibitionStickyBarProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggleSave() {
    if (!isLoggedIn) {
      void trackProductEvent({
        type: "SAVE_INTENT",
        exhibitionId,
        source: "sticky_bar",
        gaOnly: true,
        metadata: {
          contentType: "exhibition",
          contentId: exhibitionId
        }
      });
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
      const nextSaved = Boolean(data.saved);
      setSaved(nextSaved);
      if (nextSaved) {
        void trackProductEvent({
          type: "SAVE",
          exhibitionId,
          source: "sticky_bar",
          gaOnly: true,
          metadata: {
            contentType: "exhibition",
            contentId: exhibitionId
          }
        });
      }
      router.refresh();
    }
  }

  function scrollToReservation() {
    const target = document.getElementById("reservation");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    void trackProductEvent({
      type: "RESERVATION_INTENT",
      exhibitionId,
      source: "sticky_bar"
    });
  }

  function onCourseClick() {
    const isDeck =
      Boolean(courseId) ||
      Boolean(courseHref && courseHref.startsWith("/decks/"));
    void trackProductEvent({
      type: isDeck ? "RELATED_DECK_CLICK" : "RELATED_COURSE_CLICK",
      exhibitionId,
      source: "sticky_bar",
      metadata: {
        href: courseHref ?? null,
        deckId: courseId ?? null,
        curationId: courseId ?? null
      }
    });
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
        {saved ? "카드 저장됨" : "카드 저장"}
      </button>
      {courseHref && courseLabel ? (
        courseHref.startsWith("#") ? (
          <a
            className="secondary-button sticky-course"
            href={courseHref}
            onClick={onCourseClick}
          >
            {courseLabel}
          </a>
        ) : (
          <Link
            className="secondary-button sticky-course"
            href={courseHref}
            onClick={onCourseClick}
          >
            {courseLabel}
          </Link>
        )
      ) : null}
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
