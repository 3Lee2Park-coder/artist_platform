"use client";

import { useState } from "react";

type ShareActionButtonProps = {
  label: string;
  title: string;
  text: string;
  path: string;
  eventType:
    | "EXHIBITION_SHARE"
    | "ARTIST_SHARE"
    | "VISIT_SHARE"
    | "CURATION_SHARE"
    | "SPACE_SHARE";
  exhibitionId?: string;
  className?: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function ShareActionButton({
  label,
  title,
  text,
  path,
  eventType,
  exhibitionId,
  className = "secondary-button",
  source,
  metadata
}: ShareActionButtonProps) {
  const [message, setMessage] = useState("");

  async function trackShare(shareUrl: string) {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: eventType,
        exhibitionId,
        source,
        metadata: { path, shareUrl, ...metadata }
      })
    }).catch(() => undefined);
  }

  async function handleShare() {
    const shareUrl =
      typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;

    await trackShare(shareUrl);

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        setMessage("공유 화면을 열었습니다.");
        return;
      } catch {
        // 사용자가 공유를 취소한 경우 아래 복사 흐름으로 넘기지 않습니다.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setMessage("공유 링크가 복사되었습니다.");
    } catch {
      setMessage("공유를 지원하지 않는 환경입니다.");
    }
  }

  return (
    <span className="share-action-wrap">
      <button type="button" className={className} onClick={handleShare}>
        {label}
      </button>
      {message ? <small className="share-action-message">{message}</small> : null}
    </span>
  );
}
