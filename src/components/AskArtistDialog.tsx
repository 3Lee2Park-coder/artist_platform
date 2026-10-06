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
      setError("로그인 후 물어볼 수 있어요.");
      return;
    }

    if (!response.ok) {
      setError(data.error ?? "질문을 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setDone(true);
  }

  const heading = operatorFallback
    ? "OOOF.가 대신 물어볼게요"
    : unlisted
      ? "찾는 작가를 알려 주세요"
      : `${walker?.displayName}에게 물어보기`;

  const description = operatorFallback
    ? "아직 작가가 연결되어 있지 않아요. 궁금한 점을 남기면 OOOF.가 대신 물어보고, 답은 MY 질문 함에 남겨 둘게요."
    : "작품을 보다가 궁금한 게 생겼나요? 전시·작품·관람에 대해 짧게 남겨 주세요.";

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
            <p className="eyebrow">Ask</p>
            <h2 id="ask-dialog-title">질문을 보냈어요</h2>
            <p className="auth-description">
              답변이 오면 MY 질문 함과 알림에 남고, 메일로도 알려 드릴게요.
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
              {operatorFallback ? "대신 물어보기" : unlisted ? "찾는 작가" : "Ask"}
            </p>
            <h2 id="ask-dialog-title">{heading}</h2>
            <p className="auth-description">{description}</p>

            {loggedIn === false ? (
              <div className="hub-actions">
                <Link className="primary-button" href={loginHref}>
                  로그인하고 물어보기
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
                          ? "알고 있으면 적어 주세요 (없어도 돼요)"
                          : "예: 김○○"
                      }
                      required={!operatorFallback}
                    />
                  </label>
                ) : null}

                <label>
                  주제
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
                  궁금한 점
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="짧게 적어도 좋아요"
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

                {error ? (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="primary-button full-width"
                  disabled={loading || loggedIn !== true}
                >
                  {loading ? "보내는 중…" : "작가에게 물어보기"}
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
  children = "작가에게 물어보기"
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
