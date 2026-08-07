"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, birthDate, phone })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "회원가입에 실패했습니다.");
      return;
    }

    const verifyQuery = new URLSearchParams({ email });
    if (data.emailSent === false) {
      verifyQuery.set("emailFailed", "1");
    }
    router.push(`/auth/verify-email?${verifyQuery.toString()}`);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">시작하기</p>
        <h1>가입하고 동네 전시를 열어 보세요</h1>
        <p className="auth-description">
          이메일 인증만 마치면 저장·예약·방문 기록을 쓸 수 있습니다. 작가라면 승인 후
          공간과 전시를 직접 열 수 있어요.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            이름
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="홍길동"
              required
            />
          </label>
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              required
            />
          </label>
          <label>
            생년월일
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              required
            />
          </label>
          <label>
            휴대폰 번호 <span className="auth-label-note">(선택, SMS 인증 추후 제공)</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="010-1234-5678"
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8자 이상"
              minLength={8}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? "가입하는 중…" : "가입하고 시작하기"}
          </button>
        </form>

        <p className="auth-footer">
          이미 계정이 있나요? <Link href="/auth/login">로그인</Link>
        </p>
      </section>
    </main>
  );
}
