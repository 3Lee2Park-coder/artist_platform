import { BRAND } from "@/lib/brand";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong className="brand-wordmark">{BRAND.mark}</strong>
        <p className="footer-full-name">
          {BRAND.fullName} · {BRAND.koreanAlias}
        </p>
        <p>
          {BRAND.campaignLine}가 꼭꼭 숨은 동네 전시와 작가 공간을 찾아
          알려드립니다.
        </p>
      </div>
      <nav aria-label="푸터 메뉴">
        <Link href="/">홈</Link>
        <Link href="/spaces">공간</Link>
        <Link href="/exhibitions">전시</Link>
        <Link href="/map">지도</Link>
        <Link href="/about">회사소개</Link>
        <Link href="/for-artists">작가 안내</Link>
        <Link href="/register">등록 허브</Link>
      </nav>
    </footer>
  );
}
