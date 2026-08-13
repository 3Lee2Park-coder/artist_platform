import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SpacesDirectoryClient } from "@/components/SpacesDirectoryClient";
import { getPublicSpaces } from "@/lib/spaces";
import Link from "next/link";

export const revalidate = 60;

export const metadata = {
  title: "서울 작가 공간 · 공방 쇼룸",
  description:
    "서울 동네 공방·쇼룸을 모아 두었습니다. 가볼만한 작가 공간의 방문 가능 여부를 확인하고 둘러보세요.",
  alternates: { canonical: "/spaces" }
};

export default async function SpacesPage() {
  const spaces = await getPublicSpaces();

  return (
    <>
      <Header activeTab="공간" />

      <main className="page-shell space-directory-page">
        <header className="space-directory-header">
          <p className="eyebrow">공간</p>
          <h1>작가의 공간</h1>
          <p className="auth-description">
            공방·쇼룸을 동네별로 모아 두었습니다. 방문 가능 여부를 확인하고
            천천히 둘러보세요.
          </p>
          <div className="space-directory-actions">
            <Link className="secondary-button" href="/map?layer=space">
              지도에서 보기
            </Link>
            <Link className="secondary-button" href="/register/space">
              내 공간 등록
            </Link>
          </div>
        </header>

        <SpacesDirectoryClient spaces={spaces} />
      </main>

      <Footer />
    </>
  );
}
