"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type ProfileButtonProps = {
  isLoggedIn: boolean;
  userName?: string;
};

export function ProfileButton({ isLoggedIn, userName }: ProfileButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!isLoggedIn) {
    return (
      <Link className="profile-button" href="/auth/login" aria-label="로그인" title="로그인" />
    );
  }

  return (
    <div className="profile-menu">
      <Link className="profile-button logged-in" href="/my" aria-label="마이페이지" title={userName} />
      <button type="button" className="logout-button" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}
