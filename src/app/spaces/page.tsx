import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SpacesDirectoryClient } from "@/components/SpacesDirectoryClient";
import { getSession } from "@/lib/auth";
import { annotateSpaceViewerState, getPublicSpaces } from "@/lib/spaces";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "작가의 공간 | Exhibit"
};

export default async function SpacesPage() {
  const session = await getSession();
  const spacesRaw = await getPublicSpaces();
  const spaces = await annotateSpaceViewerState(spacesRaw, session?.id);

  return (
    <>
      <Header activeTab="공간" />

      <main className="page-shell space-directory-page">
        <header className="space-directory-header">
          <p className="eyebrow">Artist spaces</p>
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
