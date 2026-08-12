import { ExhibitionRegisterForm } from "@/components/ExhibitionRegisterForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession, isApprovedArtist } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "전시 등록"
};

export default async function ExhibitionRegisterPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/register/exhibition");
  }

  if (!isApprovedArtist(session)) {
    return (
      <>
        <Header activeTab="등록" />
        <main className="register-page">
          <section className="register-card">
            <p className="eyebrow">Registration</p>
            <h1>전시 등록</h1>
            <div className="status-banner warn">
              승인된 작가만 전시를 등록할 수 있습니다.{" "}
              <Link href="/register/artist">작가 승인 신청</Link>을 먼저 진행해주세요.
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header activeTab="등록" />
      <main className="register-page">
        <section className="register-card wide">
          <p className="eyebrow">Registration stepper</p>
          <h1>전시 등록</h1>
          <p className="auth-description">
            전시 정보, 장소 좌표, 예약 설정, 작품 정보를 입력하면 홈·지도·검색에 노출됩니다.
          </p>
          <ExhibitionRegisterForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
