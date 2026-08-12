import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProgramRegisterForm } from "@/components/ProgramRegisterForm";
import { getSession, isApprovedArtist } from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "프로그램 등록"
};

export default async function RegisterProgramPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/register/program");
  }

  if (!isApprovedArtist(session)) {
    redirect("/register/artist");
  }

  const today = getTodayKST();

  const [spaces, exhibitions] = await Promise.all([
    prisma.space.findMany({
      where: { ownerUserId: session.id },
      select: { id: true, name: true, slug: true, status: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.exhibition.findMany({
      where: {
        registeredById: session.id,
        source: { not: "PUBLIC_API" },
        status: { in: ["PUBLISHED", "DRAFT"] },
        endDate: { gte: today }
      },
      select: {
        id: true,
        title: true,
        venue: true,
        district: true,
        startDate: true,
        endDate: true,
        status: true,
        spaceId: true
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }]
    })
  ]);

  return (
    <>
      <Header activeTab="등록" />
      <main className="register-page">
        <ProgramRegisterForm
          spaces={spaces}
          exhibitions={exhibitions}
          isAdmin={session.role === "ADMIN"}
        />
      </main>
      <Footer />
    </>
  );
}
