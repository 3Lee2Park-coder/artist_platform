import Link from "next/link";
import { Suspense } from "react";
import { ProfileButton } from "@/components/ProfileButton";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { getSession } from "@/lib/auth";

const bottomTabs = [
  { label: "홈", href: "/" },
  { label: "공간", href: "/spaces" },
  { label: "전시", href: "/exhibitions" },
  { label: "지도", href: "/map" },
  { label: "MY", href: "/my" }
];

type HeaderProps = {
  activeTab?: string;
};

export async function Header({ activeTab = "홈" }: HeaderProps) {
  const session = await getSession();

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="전시 방문 전환형 플랫폼 홈">
            <span className="brand-mark" aria-hidden="true" />
            <span>Exhibit</span>
          </Link>

          <Suspense fallback={<div className="filter-search filter-search-skeleton" />}>
            <SearchFilterBar />
          </Suspense>

          <nav className="desktop-nav" aria-label="주요 메뉴">
            <Link
              href="/spaces"
              className={activeTab === "공간" ? "active" : undefined}
            >
              공간
            </Link>
            <Link
              href="/exhibitions"
              className={
                [
                  "nav-featured",
                  activeTab === "전시" ? "active" : ""
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              전시
            </Link>
            <Link
              href="/map"
              className={activeTab === "지도" ? "active" : undefined}
            >
              지도
            </Link>
            <Link href="/register">등록하기</Link>
            {session ? (
              <Link
                href="/my"
                className={activeTab === "MY" ? "active" : undefined}
              >
                {session.name}
              </Link>
            ) : (
              <Link href="/auth/login">로그인</Link>
            )}
            <ProfileButton isLoggedIn={Boolean(session)} userName={session?.name} />
          </nav>
        </div>
      </header>

      <nav className="bottom-tab" aria-label="모바일 하단 메뉴">
        {bottomTabs.map((tab) => {
          const classes = [
            tab.label === activeTab ? "active" : "",
            tab.label === "전시" ? "tab-featured" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={tab.label}
              className={classes || undefined}
              href={tab.href}
            >
              {tab.label === "전시" ? <span className="tab-featured-dot" aria-hidden="true" /> : null}
              <span className="tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
