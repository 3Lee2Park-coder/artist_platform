import Link from "next/link";

const bottomTabs = ["홈", "전시", "지도", "등록", "MY"];

type HeaderProps = {
  activeTab?: string;
};

export function Header({ activeTab = "홈" }: HeaderProps) {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="전시 방문 전환형 플랫폼 홈">
            <span className="brand-mark" aria-hidden="true" />
            <span>Exhibit</span>
          </Link>

          <form className="filter-search" aria-label="전시 검색 필터">
            <button type="button" className="filter-search-item">
              <span>날짜</span>
              <strong>오늘 · 이번주</strong>
            </button>
            <button type="button" className="filter-search-item">
              <span>장소</span>
              <strong>성수 · 한남 · 홍대</strong>
            </button>
            <button type="button" className="filter-search-item">
              <span>큐레이션</span>
              <strong>전체</strong>
            </button>
            <button type="submit" className="search-submit" aria-label="검색">
              ⌕
            </button>
          </form>

          <nav className="desktop-nav" aria-label="주요 메뉴">
            <Link href="/">전시</Link>
            <Link href="/map">지도</Link>
            <a href="#artists">작가</a>
            <a className="register-link" href="#register">
              등록하기
            </a>
            <a className="profile-button" href="#" aria-label="프로필" />
          </nav>
        </div>
      </header>

      <nav className="bottom-tab" aria-label="모바일 하단 메뉴">
        {bottomTabs.map((tab) => (
          <Link
            key={tab}
            className={tab === activeTab ? "active" : undefined}
            href={tab === "지도" ? "/map" : "/"}
          >
            {tab}
          </Link>
        ))}
      </nav>
    </>
  );
}
