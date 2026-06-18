import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>Exhibit</strong>
        <p>개인 작가의 전시 발견, 작품 탐색, 예약 전환을 돕는 MVP 프로토타입입니다.</p>
      </div>
      <nav aria-label="푸터 메뉴">
        <Link href="/">전시</Link>
        <Link href="/map">지도</Link>
        <a href="#">작가 권한 요청</a>
        <a href="#">문의</a>
      </nav>
    </footer>
  );
}