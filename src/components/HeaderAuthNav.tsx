import Link from "next/link";
import { ProfileButton } from "@/components/ProfileButton";
import { getSession, sessionDisplayName } from "@/lib/auth";

/** Cookie-bound nav — keep inside Suspense so public shells can stay cacheable */
export async function HeaderAuthNav({ activeTab }: { activeTab?: string }) {
  const session = await getSession();
  const label = session ? sessionDisplayName(session) : null;

  return (
    <>
      {session ? (
        <Link
          href="/my"
          className={activeTab === "MY" ? "active" : undefined}
        >
          {label}
        </Link>
      ) : (
        <Link href="/auth/login">로그인</Link>
      )}
      <ProfileButton isLoggedIn={Boolean(session)} userName={label ?? undefined} />
    </>
  );
}

export function HeaderAuthFallback() {
  return (
    <>
      <Link href="/auth/login">로그인</Link>
      <ProfileButton isLoggedIn={false} />
    </>
  );
}
