"use client";

import { intakeFailureMessage, QUESTION_TEXT_MAX } from "@/lib/question-intake";
import { useState } from "react";

type ExhibitionAskProps = {
  exhibitionId: string;
  title: string;
  artistName: string;
  venueName: string;
  isLoggedIn: boolean;
};

export function ExhibitionAsk({
  exhibitionId,
  title,
  artistName,
  venueName,
  isLoggedIn
}: ExhibitionAskProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [notifyOnAnswer, setNotifyOnAnswer] = useState(true);
  const [contactEmail, setContactEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      setError("궁금한 점을 적어 주세요.");
      return;
    }
    if (trimmed.length > QUESTION_TEXT_MAX) {
      setError("질문은 500자까지 적을 수 있어요.");
      return;
    }
    if (!isLoggedIn && notifyOnAnswer && !contactEmail.trim()) {
      setError("알림을 받으려면 이메일을 적어 주세요.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/intake-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exhibitionId,
          text: trimmed,
          notifyOnAnswer,
          contactEmail: !isLoggedIn && notifyOnAnswer ? contactEmail.trim() : undefined
        })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(intakeFailureMessage(response.status, data.error));
        return;
      }
      setDone(true);
    } catch {
      setError(intakeFailureMessage(0));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="exhibition-ask" aria-labelledby="exhibition-ask-title">
      <p className="exhibition-ask-lead" id="exhibition-ask-title">
        작품을 보다가 궁금한 게 생겼나요?
      </p>
      <p className="exhibition-ask-hint">
        작가에게 직접 묻고 싶은 것을 남겨 주세요. 작가가 바로 닿지 않는다면, OOOF.가 대신
        물어볼게요.
      </p>
      {done ? (
        <p className="exhibition-ask-success" role="status">
          질문을 보냈어요. 답변이 오면 알려드릴게요.
        </p>
      ) : open ? (
        <form className="exhibition-ask-form" onSubmit={(event) => void submit(event)}>
          <p className="exhibition-ask-context-line">
            {title}
            <span aria-hidden="true"> · </span>
            {artistName}
            <span aria-hidden="true"> · </span>
            {venueName}
          </p>
          <label>
            궁금한 점
            <textarea
              value={text}
              maxLength={QUESTION_TEXT_MAX}
              rows={3}
              placeholder="예: 이 파란색이 반복되는 이유는 무엇인가요?"
              onChange={(event) => setText(event.target.value)}
              aria-describedby="exhibition-ask-limit"
            />
          </label>
          <p className="exhibition-ask-hint" id="exhibition-ask-limit">
            짧게 적어도 좋아요. 최대 {QUESTION_TEXT_MAX}자.
          </p>
          <label className="exhibition-ask-check">
            <input
              type="checkbox"
              checked={notifyOnAnswer}
              onChange={(event) => setNotifyOnAnswer(event.target.checked)}
            />
            답변이 오면 알려주세요
          </label>
          {notifyOnAnswer ? (
            isLoggedIn ? (
              <p className="exhibition-ask-hint">
                답변이 오면 MY 알림과 메일로 「내 질문」 링크를 보내 드려요.
              </p>
            ) : (
              <label>
                알림 받을 이메일
                <input
                  type="email"
                  value={contactEmail}
                  autoComplete="email"
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </label>
            )
          ) : null}
          {error ? (
            <p className="exhibition-ask-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="secondary-button" disabled={pending}>
            {pending ? "보내는 중…" : "작가에게 물어보기"}
          </button>
        </form>
      ) : (
        <button type="button" className="secondary-button" onClick={() => setOpen(true)}>
          작가에게 물어보기
        </button>
      )}
    </section>
  );
}
