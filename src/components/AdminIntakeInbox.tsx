"use client";

import { useEffect, useState } from "react";

type IntakeQuestion = {
  id: string;
  text: string;
  status: string;
  notifyOnAnswer: boolean;
  contactEmail: string | null;
  createdAt: string;
  exhibitionTitle: string | null;
  exhibitionArtist: string | null;
  exhibitionVenue: string | null;
  workTitle: string | null;
  warnings: string[];
  answer: {
    id: string;
    text: string;
    visibility: string;
    publishedAt: string | null;
  } | null;
  recipient: {
    id: string | null;
    recipientType: string;
    opsNote: string | null;
    hasExternalContact: boolean;
  };
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "접수",
  sent: "전달",
  answered: "답변",
  rejected: "반려",
  closed: "닫힘"
};

type AdminIntakeInboxProps = {
  initialSelectedId?: string | null;
};

export function AdminIntakeInbox({ initialSelectedId = null }: AdminIntakeInboxProps) {
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [opsNote, setOpsNote] = useState("");
  const [recipientType, setRecipientType] = useState("ooof");
  const [answerDraft, setAnswerDraft] = useState("");
  const [message, setMessage] = useState("");
  const [responseLink, setResponseLink] = useState<{
    responseUrl: string;
    expiresAt: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = questions.find((item) => item.id === selectedId) ?? null;

  async function load(next?: { status?: string; from?: string; to?: string; q?: string }) {
    const params = new URLSearchParams();
    const filters = {
      status,
      from,
      to,
      q,
      ...next
    };
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.q) params.set("q", filters.q);
    const response = await fetch(`/api/admin/intake-questions?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "질문을 불러오지 못했습니다.");
      return;
    }
    const rows = (data.questions ?? []) as IntakeQuestion[];
    setQuestions(rows);
    if (initialSelectedId && rows.some((item) => item.id === initialSelectedId)) {
      setSelectedId(initialSelectedId);
    }
  }

  useEffect(() => {
    void load();
    // 첫 목록만 불러온다. 필터는 검색 버튼으로 적용한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId]);

  // selected 객체 참조가 load()마다 바뀌므로 selectedId로만 초기화한다.
  // 그렇지 않으면 방금 발급한 responseLink가 바로 null로 지워진다.
  useEffect(() => {
    if (!selectedId) return;
    const row = questions.find((item) => item.id === selectedId);
    if (!row) return;
    setOpsNote(row.recipient.opsNote ?? "");
    setRecipientType(row.recipient.recipientType || "ooof");
    setResponseLink(null);
  }, [selectedId]);

  async function save(options?: {
    nextStatus?: "sent" | "rejected" | "closed";
    issueToken?: boolean;
    answerVisibility?: "private" | "public";
    answerText?: string;
  }) {
    if (!selected) return;
    setBusy(true);
    const keepLink = Boolean(options?.issueToken || options?.nextStatus === "sent");
    if (!keepLink) setResponseLink(null);
    const response = await fetch("/api/admin/intake-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        status: options?.nextStatus,
        recipientType,
        opsNote,
        issueToken: options?.issueToken === true,
        answerVisibility: options?.answerVisibility,
        answerText: options?.answerText
      })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "저장하지 못했습니다.");
      return;
    }
    if (data.question) {
      setQuestions((current) =>
        current.map((item) => (item.id === data.question.id ? data.question : item))
      );
    }
    if (data.responseLink?.responseUrl) {
      setResponseLink(data.responseLink);
      setMessage(
        "답변 링크를 만들었습니다. 아래 URL은 지금만 보이며, 원문은 저장되지 않습니다. 작가·갤러리에게 직접 전달하세요."
      );
    } else if (options?.answerText) {
      setAnswerDraft("");
      setMessage("답변을 보냈습니다. 질문자에게 알림·메일을 보냈어요.");
    } else if (options?.answerVisibility === "public") {
      setMessage("전시 상세에 공개했습니다. (자동 공개 아님)");
    } else if (options?.answerVisibility === "private") {
      setMessage("비공개로 되돌렸습니다.");
    } else if (options?.nextStatus === "sent") {
      setMessage("전달 상태로 바꿨습니다.");
    } else if (options?.nextStatus) {
      setMessage("상태를 바꿨습니다.");
    } else {
      setMessage("메모를 저장했습니다.");
    }
    // 링크 발급 직후 load()하면 selected 갱신으로 URL이 사라질 수 있어 목록만 로컬 반영한다.
    if (!data.responseLink?.responseUrl) {
      await load();
    }
  }

  async function copyLink() {
    if (!responseLink?.responseUrl) return;
    try {
      await navigator.clipboard.writeText(responseLink.responseUrl);
      setMessage("답변 링크를 복사했습니다. 작가·갤러리에게만 전달하세요.");
    } catch {
      setMessage("복사에 실패했습니다. URL을 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <section className="register-card wide my-section">
      <h2>전시 질문 (게스트·로그인)</h2>
      <p className="auth-description">
        전시 상세 「작가에게 물어보기」로 들어온 질문입니다. OOOF.가 대신 답하거나, 작가·갤러리용
        만료형 링크를 만들어 전달하세요. 링크 원문은 DB에 저장되지 않습니다.
      </p>
      <form
        className="exhibition-ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label>
          상태
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">전체</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          시작일
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          종료일
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label>
          전시·작가·장소
          <input
            value={q}
            placeholder="제목, 작가, 장소"
            onChange={(event) => setQ(event.target.value)}
          />
        </label>
        <button type="submit" className="secondary-button">
          검색
        </button>
      </form>
      {message ? (
        <p
          className={
            message.includes("못했습니다") ||
            message.includes("없습니다") ||
            message.includes("바꿀 수") ||
            message.includes("실패")
              ? "exhibition-ask-error"
              : "exhibition-ask-success"
          }
        >
          {message}
        </p>
      ) : null}
      <div className="admin-intake">
        <ul className="admin-intake-list">
          {questions.length === 0 ? <li>조건에 맞는 질문이 없습니다.</li> : null}
          {questions.map((question) => (
            <li key={question.id}>
              <button
                type="button"
                className={question.id === selectedId ? "is-on" : ""}
                onClick={() => setSelectedId(question.id)}
              >
                <strong>{question.exhibitionTitle || "전시 없음"}</strong>
                <span>{STATUS_LABEL[question.status] ?? question.status}</span>
                <em>{question.text.slice(0, 80)}</em>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <article className="admin-intake-detail">
            <p>
              {new Date(selected.createdAt).toLocaleString("ko-KR")} ·{" "}
              {STATUS_LABEL[selected.status] ?? selected.status}
            </p>
            <dl className="exhibition-ask-context">
              <div>
                <dt>전시</dt>
                <dd>{selected.exhibitionTitle || "없음"}</dd>
              </div>
              <div>
                <dt>작가</dt>
                <dd>{selected.exhibitionArtist || "없음"}</dd>
              </div>
              <div>
                <dt>장소</dt>
                <dd>{selected.exhibitionVenue || "없음"}</dd>
              </div>
              <div>
                <dt>작품</dt>
                <dd>{selected.workTitle || "연결 없음"}</dd>
              </div>
            </dl>
            <h3>질문</h3>
            <p>{selected.text}</p>
            {selected.answer ? (
              <>
                <h3>답변</h3>
                <p>{selected.answer.text}</p>
                <p className="exhibition-ask-hint">
                  공개 상태: {selected.answer.visibility === "public" ? "공개" : "비공개"}
                  {selected.answer.publishedAt
                    ? ` · ${new Date(selected.answer.publishedAt).toLocaleString("ko-KR")}`
                    : ""}
                </p>
                <div className="collect-actions-row">
                  <button
                    type="button"
                    className={selected.answer.visibility === "public" ? "is-fill" : ""}
                    disabled={busy}
                    onClick={() =>
                      void save({
                        answerVisibility:
                          selected.answer?.visibility === "public" ? "private" : "public"
                      })
                    }
                  >
                    {selected.answer.visibility === "public"
                      ? "비공개로 되돌리기"
                      : "전시 상세에 공개"}
                  </button>
                </div>
              </>
            ) : null}
            {selected.warnings.length > 0 ? (
              <ul className="exhibition-ask-error">
                {selected.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="exhibition-ask-hint">신고·민감정보·스팸으로 보이는 표현은 없습니다.</p>
            )}
            <p className="exhibition-ask-hint">
              알림 이메일:{" "}
              {selected.notifyOnAnswer ? selected.contactEmail || "계정에 연결됨" : "받지 않음"}
            </p>
            {!selected.answer &&
            selected.status !== "closed" &&
            selected.status !== "rejected" ? (
              <label>
                OOOF.가 대신 답변
                <textarea
                  value={answerDraft}
                  rows={5}
                  maxLength={2000}
                  placeholder="게스트·로그인 질문 모두 여기서 바로 답할 수 있어요."
                  onChange={(event) => setAnswerDraft(event.target.value)}
                />
              </label>
            ) : null}
            <label>
              전달 대상
              <select
                value={recipientType}
                onChange={(event) => setRecipientType(event.target.value)}
              >
                <option value="ooof">OOOF.</option>
                <option value="artist">작가</option>
                <option value="gallery">갤러리</option>
              </select>
            </label>
            <label>
              전달 메모
              <textarea
                value={opsNote}
                rows={3}
                onChange={(event) => setOpsNote(event.target.value)}
              />
            </label>
            <div className="collect-actions-row">
              {!selected.answer &&
              selected.status !== "closed" &&
              selected.status !== "rejected" ? (
                <button
                  type="button"
                  className="is-fill"
                  disabled={busy || !answerDraft.trim()}
                  onClick={() => void save({ answerText: answerDraft.trim() })}
                >
                  답변 보내기
                </button>
              ) : null}
              <button type="button" disabled={busy} onClick={() => void save()}>
                메모 저장
              </button>
              <button
                type="button"
                disabled={busy || selected.status === "closed" || selected.status === "rejected"}
                onClick={() =>
                  void save(
                    selected.status === "submitted"
                      ? { nextStatus: "sent" }
                      : { issueToken: true }
                  )
                }
              >
                {selected.status === "submitted" ? "전달 · 링크 발급" : "링크 다시 만들기"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save({ nextStatus: "rejected" })}
              >
                반려
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save({ nextStatus: "closed" })}
              >
                닫기
              </button>
            </div>
            {responseLink ? (
              <div className="exhibition-ask" style={{ marginTop: "1rem" }}>
                <p className="exhibition-ask-hint">
                  만료: {new Date(responseLink.expiresAt).toLocaleString("ko-KR")} · 단회성
                </p>
                <label>
                  답변 링크 (지금만 표시)
                  <input readOnly value={responseLink.responseUrl} />
                </label>
                <button type="button" className="secondary-button" onClick={() => void copyLink()}>
                  링크 복사
                </button>
              </div>
            ) : (
              <p className="exhibition-ask-hint">
                전달 또는 「링크 다시 만들기」로 만료형 답변 URL을 받을 수 있습니다. 답변은 기본
                비공개입니다.
              </p>
            )}
          </article>
        ) : (
          <p className="exhibition-ask-hint">목록에서 질문을 고르면 원문이 열립니다.</p>
        )}
      </div>
    </section>
  );
}
