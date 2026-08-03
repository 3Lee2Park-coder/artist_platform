import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProgramRegisterForm } from "@/components/ProgramRegisterForm";
import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "프로그램 등록 | Exhibit"
};

export default async function RegisterProgramPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/register/program");
  }

  if (!isApprovedArtist(session)) {
    redirect("/register/artist");
  }

  const spaces = await prisma.space.findMany({
    where: { ownerUserId: session.id },
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Header activeTab="등록" />
      <main className="register-page">
        <ProgramRegisterForm spaces={spaces} isAdmin={session.role === "ADMIN"} />
      </main>
      <Footer />
    </>
  );
}
