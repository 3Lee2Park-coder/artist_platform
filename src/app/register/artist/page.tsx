import { ArtistApplyForm } from "@/components/ArtistApplyForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "작가 승인 신청 | Exhibit"
};

export default async function ArtistApplyPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/register/artist");
  }

  return (
    <>
      <Header activeTab="등록" />
      <main className="register-page">
        <section className="register-card">
          <p className="eyebrow">Artist application</p>
          <h1>작가 승인 신청</h1>
          <p className="auth-description">
            전시 등록을 원하는 회원은 작가 권한 승인 후 등록 Stepper에 진입할 수 있습니다.
          </p>
          <ArtistApplyForm artistStatus={session.artistStatus} />
          <p className="auth-footer">
            <Link href="/register">등록 허브로 돌아가기</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
