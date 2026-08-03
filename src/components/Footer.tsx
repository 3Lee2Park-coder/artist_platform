import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>Exhibit</strong>
        <p>
          개인 작가의 공간·전시 발견과 동네 코스, 예약까지 이어 주는 플랫폼입니다.
        </p>
      </div>
      <nav aria-label="푸터 메뉴">
        <Link href="/">홈</Link>
        <Link href="/spaces">공간</Link>
        <Link href="/exhibitions">전시</Link>
        <Link href="/map">지도</Link>
        <Link href="/for-artists">작가·공간 파트너</Link>
        <Link href="/register">등록 허브</Link>
      </nav>
    </footer>
  );
}
