import { LoginForm } from "@/components/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <div className="auth-card">로딩 중...</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
