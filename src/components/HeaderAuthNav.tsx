import Link from "next/link";
import { ProfileButton } from "@/components/ProfileButton";
import { getSession, sessionDisplayName } from "@/lib/auth";
import { countUnreadNotices } from "@/lib/notices";

/** Cookie-bound nav — keep inside Suspense so public shells can stay cacheable */
export async function HeaderAuthNav({ activeTab }: { activeTab?: string }) {
  const session = await getSession();
  const label = session ? sessionDisplayName(session) : null;
  const unread = session ? await countUnreadNotices(session.id) : 0;

  return (
    <>
      {session ? (
        <Link
          href={unread > 0 ? "/my#notices" : "/my"}
          className={activeTab === "MY" ? "active" : undefined}
        >
          {label}
          {unread > 0 ? (
            <span className="nav-notice-count" aria-label={`읽지 않은 알림 ${unread}개`}>
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
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
