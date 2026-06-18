const bottomTabs = ["홈", "전시", "지도", "등록", "MY"];

export function Header() {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="전시 방문 전환형 플랫폼 홈">
            <span className="brand-mark" aria-hidden="true" />
            <span>Exhibit</span>
          </a>

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
            <a href="#">전시</a>
            <a href="#">지도</a>
            <a href="#">작가</a>
            <a className="register-link" href="#">
              등록하기
            </a>
            <a className="profile-button" href="#" aria-label="프로필" />
          </nav>
        </div>
      </header>

      <nav className="bottom-tab" aria-label="모바일 하단 메뉴">
        {bottomTabs.map((tab) => (
          <a key={tab} className={tab === "홈" ? "active" : undefined} href="#">
            {tab}
          </a>
        ))}
      </nav>
    </>
  );
}
