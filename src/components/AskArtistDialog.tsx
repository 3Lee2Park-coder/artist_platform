"use client";

import type { HomeWalker } from "@/lib/walkers";
import Link from "next/link";
import { useEffect, useState } from "react";

const QUESTION_TOPICS = {
  EXHIBITION: "전시",
  ARTWORK: "작품",
  VISIT: "관람·방문"
} as const;

type QuestionTopic = keyof typeof QUESTION_TOPICS;

export type AskArtistTarget = {
  artistId?: string | null;
  artistName: string;
  exhibitionId?: string | null;
  imageUrl?: string | null;
};

type AskArtistDialogProps = {
  walker: HomeWalker | null;
  unlisted: boolean;
  onClose: () => void;
  exhibitionId?: string | null;
  suggestedArtistName?: string;
  operatorFallback?: boolean;
};

const TOPICS: QuestionTopic[] = ["EXHIBITION", "ARTWORK", "VISIT"];

export function AskArtistDialog({
  walker,
  unlisted,
  onClose,
  exhibitionId,
  suggestedArtistName,
  operatorFallback = false
}: AskArtistDialogProps) {
  const [topic, setTopic] = useState<QuestionTopic>("EXHIBITION");
  const [body, setBody] = useState("");
  const [fromName, setFromName] = useState("");
  const [unlistedName, setUnlistedName] = useState(suggestedArtistName ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loginHref, setLoginHref] = useState("/auth/login");

  useEffect(() => {
    let cancelled = false;
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    setLoginHref(`/auth/login?redirect=${encodeURIComponent(path)}`);

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data?.user) {
          setLoggedIn(false);
          return;
        }
        setLoggedIn(true);
        setFromName((prev) => prev || data.user.nickname || data.user.name || "");
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!walker && !unlisted) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: unlisted || operatorFallback || !walker ? "UNLISTED" : "REGISTERED",
        topic,
        artistUserId: walker?.id,
        unlistedArtistName:
          unlisted || operatorFallback
            ? unlistedName.trim() || suggestedArtistName || undefined
            : undefined,
        exhibitionId: exhibitionId || undefined,
        fromName: fromName.trim() || undefined,
        body
      })
    });
    const data = await response.json();
    setLoading(false);

    if (response.status === 401 || data.loginRequired) {
      setLoggedIn(false);
      setError("로그인 후 질문을 남길 수 있습니다.");
      return;
    }

    if (!response.ok) {
      setError(data.error ?? "질문을 보내지 못했습니다.");
      return;
    }

    setDone(true);
  }

  const heading = operatorFallback
    ? "술래가 대신 물어 보겠습니다"
    : unlisted
      ? "찾고 있는 작가를 알려 주세요"
      : `${walker?.displayName}에게 묻기`;

  const description = operatorFallback
    ? "이 발견에는 아직 작가가 연결되어 있지 않습니다. OOOF.가 작가에게 대신 묻고, 답변을 MY 질문 함에 남겨 드립니다."
    : "전시·작품·관람에 대한 질문을 남겨 주세요. 비방·욕설 등 관련 없는 질문은 반려될 수 있습니다.";

  return (
    <div className="ask-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ask-dialog"
        role="dialog"
        aria-labelledby="ask-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="ask-dialog-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        {done ? (
          <>
            <p className="eyebrow">질문 접수</p>
            <h2 id="ask-dialog-title">질문을 남겼습니다</h2>
            <p className="auth-description">
              비방·욕설 등 관련 없는 질문은 반려될 수 있습니다. 답변이 오면 MY
              질문 함과 알림에 남고, 이메일로도 알려 드립니다.
            </p>
            <div className="hub-actions">
              <Link className="primary-button" href="/my#inbox">
                질문 함 열기
              </Link>
              <button type="button" className="secondary-button" onClick={onClose}>
                닫기
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">
              {operatorFallback ? "아직 작가가 없어요" : unlisted ? "아직 없는 작가" : "작가에게 묻기"}
            </p>
            <h2 id="ask-dialog-title">{heading}</h2>
            <p className="auth-description">{description}</p>

            {loggedIn === false ? (
              <div className="hub-actions">
                <Link className="primary-button" href={loginHref}>
                  로그인하고 질문하기
                </Link>
                <button type="button" className="secondary-button" onClick={onClose}>
                  닫기
                </button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                {unlisted ? (
                  <label>
                    작가 이름
                    <input
                      value={unlistedName}
                      onChange={(event) => setUnlistedName(event.target.value)}
                      placeholder={
                        operatorFallback
                          ? "알고 있으면 적어 주세요 (없어도 됩니다)"
                          : "예: 김○○"
                      }
                      required={!operatorFallback}
                    />
                  </label>
                ) : null}

                <label>
                  질문 종류
                  <select
                    value={topic}
                    onChange={(event) => setTopic(event.target.value as QuestionTopic)}
                  >
                    {TOPICS.map((key) => (
                      <option key={key} value={key}>
                        {QUESTION_TOPICS[key]}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  질문
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={5}
                    placeholder="보고 싶은 전시나 작품에 대해 구체적으로 적어 주세요."
                    required
                  />
                </label>

                <label>
                  이름
                  <input
                    value={fromName}
                    onChange={(event) => setFromName(event.target.value)}
                    required
                  />
                </label>

                {error ? <p className="form-error">{error}</p> : null}

                <button
                  type="submit"
                  className="primary-button full-width"
                  disabled={loading || loggedIn !== true}
                >
                  {loading ? "보내는 중…" : "질문 남기기"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AskArtistTrigger({
  target,
  className,
  children = "작가에게 묻기"
}: {
  target: AskArtistTarget;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasArtist = Boolean(target.artistId);
  const walker: HomeWalker | null = hasArtist && target.artistId
    ? {
        id: target.artistId,
        displayName: target.artistName,
        initial: target.artistName.trim().charAt(0) || "술",
        imageUrl: target.imageUrl ?? null,
        usesMascot: !target.imageUrl,
        bio: null,
        href: `/artists/${target.artistId}`
      }
    : null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open ? (
        <AskArtistDialog
          walker={walker}
          unlisted={!hasArtist}
          operatorFallback={!hasArtist}
          suggestedArtistName={target.artistName}
          exhibitionId={target.exhibitionId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
