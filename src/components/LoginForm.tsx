"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      if (data.requiresVerification && data.email) {
        setError(data.error ?? "이메일 인증이 필요합니다.");
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }
      setError(data.error ?? "로그인에 실패했습니다.");
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Login</p>
        <h1>로그인</h1>
        <p className="auth-description">
          통합 회원으로 로그인하면 예약, 저장, 전시 등록 신청을 이어서 진행할 수 있습니다.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@exhibit.kr"
              required
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8자 이상"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="auth-footer">
          아직 계정이 없나요? <Link href="/auth/signup">회원가입</Link>
        </p>
        <p className="auth-demo">
          데모 계정: member@exhibit.kr / artist@exhibit.kr (비밀번호 demo1234)
        </p>
      </section>
    </main>
  );
}
