import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SpaceRegisterForm } from "@/components/SpaceRegisterForm";
import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SpaceEditPage({ params }: EditPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/my");
  }

  if (!isApprovedArtist(session)) {
    redirect("/my");
  }

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });

  if (!space) {
    notFound();
  }

  if (space.ownerUserId !== session.id && session.role !== "ADMIN") {
    redirect("/my");
  }

  return (
    <>
      <Header activeTab="MY" />
      <main className="register-page">
        <SpaceRegisterForm mode="edit" initial={space} />
      </main>
      <Footer />
    </>
  );
}
