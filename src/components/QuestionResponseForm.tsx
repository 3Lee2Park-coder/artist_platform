"use client";

import { useState, type FormEvent } from "react";

type QuestionResponseFormProps = {
  token: string;
  expiresAt: string;
  initialError?: string | null;
};

export function QuestionResponseForm({
  token,
  expiresAt,
  initialError = null
}: QuestionResponseFormProps) {
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState(initialError ?? "");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || done) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/question-response/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer })
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(typeof data.error === "string" ? data.error : "답변을 보내지 못했어요.");
      return;
    }
    setDone(true);
    setMessage("답변을 보냈어요. 질문한 분에게 알려 둘게요. 이 링크는 이제 닫혀요.");
  }

  if (done) {
    return (
      <p className="exhibition-ask-success" role="status">
        {message}
      </p>
    );
  }

  return (
    <form className="exhibition-ask-form" onSubmit={onSubmit}>
      <label>
        답변
        <textarea
          value={answer}
          rows={7}
          maxLength={2000}
          placeholder="궁금증에 답해 주세요. 기본은 질문자에게만 보여요."
          onChange={(event) => setAnswer(event.target.value)}
          required
        />
      </label>
      <p className="exhibition-ask-hint">
        {new Date(expiresAt).toLocaleString("ko-KR")}까지, 한 번만 쓸 수 있어요.
      </p>
      {message ? (
        <p className="exhibition-ask-error" role="alert">
          {message}
        </p>
      ) : null}
      <button type="submit" className="primary-btn" disabled={busy || !answer.trim()}>
        {busy ? "보내는 중…" : "답변 보내기"}
      </button>
    </form>
  );
}
