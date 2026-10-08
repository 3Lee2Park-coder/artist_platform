"use client";

import { OPERATOR_UNLISTED_NAME, QUESTION_TOPICS } from "@/lib/question-topics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type InboxNotice = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AskedQuestion = {
  id: string;
  kind: string;
  topic: string;
  status: string;
  body: string;
  answer: string | null;
  artistName: string;
  createdAt: string;
  answeredAt: string | null;
};

export type IntakeAskedQuestion = {
  id: string;
  status: string;
  statusMessage: string;
  text: string;
  answer: string | null;
  exhibitionTitle: string | null;
  exhibitionArtist: string | null;
  workTitle: string | null;
  createdAt: string;
  answeredAt: string | null;
  detailHref: string;
};

const QUESTION_STATUS: Record<string, string> = {
  PENDING: "질문을 보냈어요",
  APPROVED: "질문을 전달했어요. 답변을 기다리고 있어요.",
  FORWARDED: "질문을 전달했어요. 답변을 기다리고 있어요.",
  ANSWERED: "답변이 왔어요. 작가의 이야기를 확인해 보세요.",
  REJECTED: "이번엔 전달되지 않았어요"
};

type MyInboxSectionProps = {
  notices: InboxNotice[];
  questions: AskedQuestion[];
  intakeQuestions?: IntakeAskedQuestion[];
};

export function MyNoticesSection({
  notices
}: Pick<MyInboxSectionProps, "notices">) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = useMemo(
    () => notices.filter((notice) => !notice.readAt).length,
    [notices]
  );

  async function mark(id?: string, all = false) {
    setBusy(true);
    await fetch("/api/my/notices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { id })
    }).catch(() => undefined);
    setBusy(false);
    router.refresh();
  }

  async function openNotice(notice: InboxNotice) {
    if (!notice.readAt) await mark(notice.id);
    if (notice.href) {
      router.push(notice.href);
      return;
    }
    if (notice.type === "QUESTION_RECEIVED") {
      router.push("/my?view=artist#received-questions");
    }
  }

  return (
    <section id="notices" className="register-card wide my-section">
      <div className="my-inbox-head">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>알림 {unread > 0 ? `(${unread})` : ""}</h2>
          <p className="auth-description">
            질문 답변과 저장한 전시 안내를 여기서 확인할 수 있어요.
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => mark(undefined, true)}
          >
            모두 읽음
          </button>
        ) : null}
      </div>
      {notices.length > 0 ? (
        <div className="my-list">
          {notices.map((notice) => (
            <article
              key={notice.id}
              className={`my-list-card my-notice-item${notice.readAt ? "" : " is-unread"}`}
            >
              <div>
                <h3>{notice.title}</h3>
                <p className="field-hint">
                  {notice.createdAt.slice(0, 10).replaceAll("-", ".")}
                </p>
                {notice.body ? <p>{notice.body}</p> : null}
              </div>
              {notice.href ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => openNotice(notice)}
                >
                  보기
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="auth-description">아직 알림이 없습니다.</p>
      )}
    </section>
  );
}

export function MyQuestionsSection({
  questions,
  intakeQuestions = []
}: Pick<MyInboxSectionProps, "questions" | "intakeQuestions">) {
  const total = questions.length + intakeQuestions.length;
  return (
    <section id="inbox" className="register-card wide my-section">
      <p className="eyebrow">Ask</p>
      <h2>내 질문 함 {total > 0 ? `(${total})` : ""}</h2>
      <p className="auth-description">
        전시에서 남긴 질문이에요. 답변이 오면 여기서 작가의 이야기를 확인할 수 있어요.
      </p>
      {intakeQuestions.length > 0 ? (
        <div className="my-list" style={{ marginBottom: "1.25rem" }}>
          {intakeQuestions.map((question) => (
            <article key={question.id} className="my-list-card">
              <div>
                <h3>{question.exhibitionTitle || question.exhibitionArtist || "전시 질문"}</h3>
                <p className="field-hint">{question.statusMessage}</p>
                <p>{question.text}</p>
                {question.answer ? (
                  <p className="my-question-answer">답변: {question.answer}</p>
                ) : null}
              </div>
              <Link className="secondary-button" href={question.detailHref}>
                {question.status === "answered" ? "답변 확인" : "자세히"}
              </Link>
            </article>
          ))}
        </div>
      ) : null}
      {questions.length > 0 ? (
        <div className="my-list">
          {questions.map((question) => (
            <article key={question.id} className="my-list-card">
              <div>
                <h3>{question.artistName || OPERATOR_UNLISTED_NAME}</h3>
                <p className="field-hint">
                  {QUESTION_TOPICS[question.topic as keyof typeof QUESTION_TOPICS] ??
                    question.topic}{" "}
                  · {QUESTION_STATUS[question.status] ?? question.status}
                </p>
                <p>{question.body}</p>
                {question.answer ? (
                  <p className="my-question-answer">답변: {question.answer}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {total === 0 ? (
        <p className="auth-description my-empty-soft">
          아직 남긴 질문이 없어요. 전시를 보다가 궁금한 게 생기면 「작가에게 물어보기」로 남겨
          보세요.
        </p>
      ) : null}
      <Link href="/#ask-artists" className="my-ask-more">
        찾는 작가가 목록에 없나요? OOOF.에 대신 물어보기
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
