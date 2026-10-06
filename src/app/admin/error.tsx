"use client";

export default function AdminError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="section" style={{ padding: "3rem 1.25rem", maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
        관리자 페이지를 불러오지 못했습니다
      </h1>
      <p style={{ color: "#666", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        다시 시도하거나 새로고침 해주세요.
      </p>
      <button type="button" className="primary-btn" onClick={() => reset()}>
        다시 시도
      </button>
    </main>
  );
}
