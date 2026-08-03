import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SpaceRegisterForm } from "@/components/SpaceRegisterForm";
import { getSession, isApprovedArtist } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "공간 등록 | Exhibit"
};

export default async function RegisterSpacePage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/register/space");
  }

  if (!isApprovedArtist(session)) {
    redirect("/register/artist");
  }

  return (
    <>
      <Header activeTab="등록" />
      <main className="register-page">
        <SpaceRegisterForm isAdmin={session.role === "ADMIN"} />
      </main>
      <Footer />
    </>
  );
}
