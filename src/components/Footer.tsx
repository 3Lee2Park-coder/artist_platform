import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>Sokkup</strong>
        <p>
          작가의 공간에서 작품과 사람을 직접 만나는 동네 전시를 잇는 플랫폼입니다.
          코스·지도·방문 안내로, 더 쉽고 재미있게 예술을 향유하세요.
        </p>
      </div>
      <nav aria-label="푸터 메뉴">
        <Link href="/">홈</Link>
        <Link href="/spaces">공간</Link>
        <Link href="/exhibitions">전시</Link>
        <Link href="/map">지도</Link>
        <Link href="/for-artists">작가로 열기</Link>
        <Link href="/register">등록 허브</Link>
      </nav>
    </footer>
  );
}
