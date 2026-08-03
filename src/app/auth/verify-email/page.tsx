"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [status, setStatus] = useState<"waiting" | "verifying" | "success" | "error">(
    token ? "verifying" : "waiting"
  );
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const verificationToken = token;

    async function verify() {
      const response = await fetch(
        `/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "인증에 실패했습니다.");
        return;
      }

      setStatus("success");
      setMessage("이메일 인증이 완료되었습니다. 로그인 후 이용해 주세요.");
      setTimeout(() => router.push("/auth/login"), 1800);
    }

    verify();
  }, [token, router]);

  async function resend() {
    if (!email) {
      return;
    }

    setResendLoading(true);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setResendLoading(false);
    setMessage("인증 메일을 다시 보냈습니다. 메일함을 확인해 주세요.");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Verify Email</p>
        <h1>이메일 인증</h1>

        {status === "success" ? (
          <p className="auth-description">{message}</p>
        ) : status === "verifying" ? (
          <p className="auth-description">인증을 처리하는 중입니다…</p>
        ) : (
          <>
            <p className="auth-description">
              {email ? `${email} ` : ""}로 인증 메일을 보냈습니다. 메일함의 링크를 눌러
              인증을 완료해 주세요.
            </p>
            {message ? <p className="form-success">{message}</p> : null}
            {status === "error" ? <p className="form-error">{message}</p> : null}
            <button
              type="button"
              className="secondary-button full-width"
              disabled={resendLoading || !email}
              onClick={resend}
            >
              {resendLoading ? "전송 중..." : "인증 메일 다시 받기"}
            </button>
          </>
        )}

        <p className="auth-footer">
          <Link href="/auth/login">로그인으로 돌아가기</Link>
        </p>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="auth-page" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
