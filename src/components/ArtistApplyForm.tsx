"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ArtistApplyPageProps = {
  artistStatus: string;
};

export function ArtistApplyForm({ artistStatus }: ArtistApplyPageProps) {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [activityArea, setActivityArea] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (artistStatus === "APPROVED") {
    return (
      <div className="status-banner ok">
        작가 승인이 완료되었습니다.{" "}
        <Link href="/register/space">공간 등록</Link>부터 시작하는 것을 권장합니다.{" "}
        <Link href="/register">등록 허브</Link>로 이동할 수도 있습니다.
      </div>
    );
  }

  if (artistStatus === "PENDING") {
    return (
      <div className="status-banner warn">
        작가 승인 신청이 심사 중입니다. 보통 1–2일 안에 결과를 알려 드리며, 승인
        후 공간·전시·프로그램 등록이 가능합니다.
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/artist-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, portfolioUrl, activityArea })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "신청에 실패했습니다.");
      return;
    }

    router.push("/register");
    router.refresh();
  }

  return (
    <>
      {artistStatus === "REJECTED" ? (
        <div className="status-banner warn">
          이전 신청이 반려되었습니다. 소개·포트폴리오를 보완해 다시 신청해
          주세요.
        </div>
      ) : null}

      <form className="auth-form register-form" onSubmit={handleSubmit}>
        <label>
          작가 소개
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="작업 방식, 주요 매체, 최근 활동을 소개해주세요."
            rows={5}
            required
          />
        </label>
        <label>
          포트폴리오 URL
          <input
            type="url"
            value={portfolioUrl}
            onChange={(event) => setPortfolioUrl(event.target.value)}
            placeholder="https://"
          />
        </label>
        <label>
          활동 지역
          <input
            type="text"
            value={activityArea}
            onChange={(event) => setActivityArea(event.target.value)}
            placeholder="예: 성수, 한남, 신당"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="primary-button full-width" disabled={loading}>
          {loading
            ? "제출 중..."
            : artistStatus === "REJECTED"
              ? "다시 신청하기"
              : "작가 승인 신청"}
        </button>
      </form>
    </>
  );
}
