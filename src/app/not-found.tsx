import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";

export const metadata = {
  title: "404",
  robots: { index: false, follow: false }
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="share-page" style={{ padding: "4rem 1.25rem", textAlign: "center" }}>
        <p className="eyebrow">404</p>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p style={{ marginTop: "0.75rem", opacity: 0.75 }}>
          주소가 바뀌었거나 삭제된 페이지일 수 있습니다.
        </p>
        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/" className="primary-button">
            홈으로
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
