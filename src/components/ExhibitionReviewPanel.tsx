"use client";

import type { ExhibitionReview, RecommendStats } from "@/lib/exhibitions";
import { REVIEW_MOOD_TAGS } from "@/lib/taste";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ExhibitionReviewPanelProps = {
  exhibitionId: string;
  isLoggedIn: boolean;
  initialVisited: boolean;
  stats: RecommendStats;
  reviews: ExhibitionReview[];
  myReview: ExhibitionReview | null;
};

export function ExhibitionReviewPanel({
  exhibitionId,
  isLoggedIn,
  initialVisited,
  stats,
  reviews,
  myReview
}: ExhibitionReviewPanelProps) {
  const router = useRouter();
  const [visited, setVisited] = useState(initialVisited);
  const [editing, setEditing] = useState(false);
  const [recommend, setRecommend] = useState<boolean>(
    myReview ? myReview.recommend : false
  );
  const [moodTags, setMoodTags] = useState<string[]>(myReview?.moodTags ?? []);
  const [memo, setMemo] = useState(myReview?.memo ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function requireLogin() {
    router.push(`/auth/login?redirect=/exhibitions/${exhibitionId}`);
  }

  async function toggleVisited() {
    if (!isLoggedIn) return requireLogin();

    setPending(true);
    const response = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exhibitionId })
    });
    setPending(false);

    if (response.ok) {
      const data = await response.json();
      setVisited(Boolean(data.visited));
      router.refresh();
    }
  }

  async function submitReview() {
    if (!isLoggedIn) return requireLogin();

    if (!recommend) {
      setMessage("추천하시려면 '추천해요'를 선택해주세요.");
      return;
    }

    setPending(true);
    setMessage("");

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exhibitionId, recommend, moodTags, memo })
    });

    setPending(false);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "리뷰 저장에 실패했습니다.");
      return;
    }

    setVisited(true);
    setEditing(false);
    setMessage("리뷰가 저장되었습니다.");
    router.refresh();
  }

  async function deleteReview() {
    setPending(true);
    await fetch(`/api/reviews?exhibitionId=${exhibitionId}`, { method: "DELETE" });
    setPending(false);
    setRecommend(false);
    setMoodTags([]);
    setMemo("");
    setEditing(false);
    router.refresh();
  }

  function toggleTag(tag: string) {
    setMoodTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const showForm = editing || (!myReview && isLoggedIn);

  return (
    <section className="detail-section review-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Reviews</p>
          <h2>관람객 추천</h2>
          <p className="review-section-lead">
            다녀온 분들이 남긴 추천과 한줄평입니다.
          </p>
        </div>
      </div>

      <div className="recommend-summary">
        <div className="recommend-rate">
          <strong>{stats.rate}%</strong>
          <span>추천율</span>
        </div>
        <p>
          총 {stats.total}명이 평가했고, {stats.recommendCount}명이 이 전시를 추천했습니다.
        </p>
      </div>

      <div className="review-cta">
        <button
          type="button"
          className={visited ? "primary-button" : "secondary-button"}
          onClick={toggleVisited}
          disabled={pending}
        >
          {visited ? "✓ 다녀온 전시" : "다녀왔어요"}
        </button>
        {myReview && !editing ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setEditing(true)}
          >
            내 리뷰 수정
          </button>
        ) : null}
        {!isLoggedIn ? (
          <button type="button" className="secondary-button" onClick={requireLogin}>
            로그인하고 기록하기
          </button>
        ) : null}
      </div>

      {message ? <p className="form-success">{message}</p> : null}

      {showForm ? (
        <div className="review-form">
          <p className="field-label">이 전시를 추천하시나요?</p>
          <div className="recommend-toggle">
            <button
              type="button"
              className={recommend ? "recommend-btn up active" : "recommend-btn up"}
              onClick={() => setRecommend(true)}
            >
              👍 추천해요
            </button>
          </div>

          <p className="field-label">어떤 점이 좋았나요? (선택)</p>
          <div className="chip-select">
            {REVIEW_MOOD_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={moodTags.includes(tag) ? "taste-chip active" : "taste-chip"}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <p className="field-label">한줄평 (선택)</p>
          <textarea
            className="review-memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="전시에서 인상 깊었던 점을 짧게 남겨보세요."
            rows={3}
            maxLength={1000}
          />

          <div className="review-form-actions">
            <button
              type="button"
              className="primary-button"
              onClick={submitReview}
              disabled={pending}
            >
              {pending ? "저장 중..." : "리뷰 저장"}
            </button>
            {myReview ? (
              <button
                type="button"
                className="secondary-button warn-button"
                onClick={deleteReview}
                disabled={pending}
              >
                리뷰 삭제
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="review-list">
        {reviews.filter((review) => review.recommend).length > 0 ? (
          reviews
            .filter((review) => review.recommend)
            .map((review) => (
            <article key={review.id} className="review-card">
              <div className="review-card-head">
                <strong>{review.userName}</strong>
                <span className="recommend-pill up">👍 추천</span>
              </div>
              {review.moodTags.length > 0 ? (
                <div className="review-tags">
                  {review.moodTags.map((tag) => (
                    <span key={`${review.id}-${tag}`}>{tag}</span>
                  ))}
                </div>
              ) : null}
              {review.memo ? <p>{review.memo}</p> : null}
            </article>
          ))
        ) : (
          <div className="empty-state">첫 번째 리뷰를 남겨보세요.</div>
        )}
      </div>
    </section>
  );
}
