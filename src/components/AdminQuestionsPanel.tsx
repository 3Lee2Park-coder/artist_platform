"use client";

import { QUESTION_TOPICS } from "@/lib/question-topics";
import { useState } from "react";

export type AdminQuestionRow = {
  id: string;
  kind: string;
  topic: string;
  status: string;
  fromName: string;
  fromEmail: string;
  body: string;
  answer: string | null;
  adminNote: string | null;
  unlistedArtistName: string | null;
  createdAt: string;
  artistName: string | null;
  exhibitionTitle: string | null;
};

export type AdminWalkerRow = {
  userId: string;
  name: string;
  email: string;
  showOnHome: boolean;
};

type AdminQuestionsPanelProps = {
  questions: AdminQuestionRow[];
  walkers: AdminWalkerRow[];
  onRefresh: () => void;
  onMessage: (message: string) => void;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "검수 대기",
  APPROVED: "작가에게 전달",
  REJECTED: "반려",
  ANSWERED: "답변 완료",
  FORWARDED: "운영이 전달 중"
};

export function AdminQuestionsPanel({
  questions,
  walkers,
  onRefresh,
  onMessage
}: AdminQuestionsPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const pendingCount = questions.filter(
    (item) => item.status === "PENDING" || item.status === "FORWARDED"
  ).length;

  async function moderate(
    id: string,
    action: "approve" | "reject" | "forward" | "answer"
  ) {
    setBusyId(id);
    const response = await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        action,
        answer: action === "answer" ? answerDrafts[id] : undefined
      })
    });
    const data = await response.json();
    setBusyId(null);
    if (!response.ok) {
      onMessage(data.error ?? "처리에 실패했습니다.");
      return;
    }
    onMessage("질문을 처리했습니다.");
    onRefresh();
  }

  async function toggleWalker(userId: string, showOnHome: boolean) {
    setBusyId(userId);
    const response = await fetch("/api/admin/artist-applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, showOnHome: !showOnHome })
    });
    const data = await response.json();
    setBusyId(null);
    if (!response.ok) {
      onMessage(data.error ?? "변경에 실패했습니다.");
      return;
    }
    onMessage(showOnHome ? "홈 술래에서 내렸습니다." : "홈 술래로 올렸습니다.");
    onRefresh();
  }

  return (
    <>
      <section className="register-card wide my-section">
        <h2>홈 술래 ({walkers.filter((item) => item.showOnHome).length})</h2>
        <p className="auth-description">
          동의한 작가만 홈에 떠다닙니다. 작가가 MY에서 직접 켜고 끌 수도 있습니다.
        </p>
        {walkers.length > 0 ? (
          <div className="my-list">
            {walkers.map((walker) => (
              <article key={walker.userId} className="my-list-card">
                <div>
                  <h3>{walker.name}</h3>
                  <p>{walker.email}</p>
                  <p className="field-hint">
                    {walker.showOnHome ? "홈에 등장 중" : "홈에 등장하지 않음"}
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busyId === walker.userId}
                  onClick={() => toggleWalker(walker.userId, walker.showOnHome)}
                >
                  {walker.showOnHome ? "홈에서 내리기" : "홈에 올리기"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">승인된 작가가 없습니다.</div>
        )}
      </section>

      <section className="register-card wide my-section">
        <h2>작가 질문 ({pendingCount}건 대기)</h2>
        <p className="auth-description">
          등록 작가는 승인 후 본인에게 전달됩니다. 작가가 없거나 아직 연결되지
          않은 질문은 운영이 대신 묻고 답합니다. 전시·작품과 무관한 글은
          반려하세요.
        </p>
        {questions.length > 0 ? (
          <div className="my-list">
            {questions.map((question) => (
              <article key={question.id} className="my-list-card">
                <div>
                  <h3>
                    {question.kind === "UNLISTED"
                      ? question.unlistedArtistName || "작가를 특정하지 않음"
                      : question.artistName}{" "}
                    · {QUESTION_TOPICS[question.topic as keyof typeof QUESTION_TOPICS] ?? question.topic}
                  </h3>
                  <p className="field-hint">
                    {STATUS_LABEL[question.status] ?? question.status} · {question.fromName} (
                    {question.fromEmail})
                    {question.exhibitionTitle ? ` · ${question.exhibitionTitle}` : ""}
                  </p>
                  <p>{question.body}</p>
                  {question.answer ? (
                    <p className="field-hint">답변: {question.answer}</p>
                  ) : null}
                  {question.kind === "UNLISTED" &&
                  (question.status === "PENDING" || question.status === "FORWARDED") ? (
                    <label className="field">
                      <span>운영 답변</span>
                      <textarea
                        rows={3}
                        value={answerDrafts[question.id] ?? ""}
                        onChange={(event) =>
                          setAnswerDrafts((prev) => ({
                            ...prev,
                            [question.id]: event.target.value
                          }))
                        }
                      />
                    </label>
                  ) : null}
                </div>
                <div className="hub-actions">
                  {question.status === "PENDING" && question.kind === "REGISTERED" ? (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={busyId === question.id}
                        onClick={() => moderate(question.id, "approve")}
                      >
                        작가에게 전달
                      </button>
                      <button
                        type="button"
                        className="secondary-button warn-button"
                        disabled={busyId === question.id}
                        onClick={() => moderate(question.id, "reject")}
                      >
                        반려
                      </button>
                    </>
                  ) : null}
                  {question.kind === "UNLISTED" &&
                  (question.status === "PENDING" || question.status === "FORWARDED") ? (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={busyId === question.id}
                        onClick={() => moderate(question.id, "answer")}
                      >
                        대신 답하기
                      </button>
                      {question.status === "PENDING" ? (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={busyId === question.id}
                          onClick={() => moderate(question.id, "forward")}
                        >
                          전달 중으로
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="secondary-button warn-button"
                        disabled={busyId === question.id}
                        onClick={() => moderate(question.id, "reject")}
                      >
                        반려
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">질문이 없습니다.</div>
        )}
      </section>
    </>
  );
}
