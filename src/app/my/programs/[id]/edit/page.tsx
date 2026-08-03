import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProgramRegisterForm } from "@/components/ProgramRegisterForm";
import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProgramEditPage({ params }: EditPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/my");
  }

  if (!isApprovedArtist(session)) {
    redirect("/my");
  }

  const { id } = await params;
  const program = await prisma.program.findUnique({
    where: { id },
    include: { space: { select: { ownerUserId: true } } }
  });

  if (!program) {
    notFound();
  }

  const canEdit =
    program.hostUserId === session.id ||
    program.space.ownerUserId === session.id ||
    session.role === "ADMIN";

  if (!canEdit) {
    redirect("/my");
  }

  const spaces = await prisma.space.findMany({
    where: { ownerUserId: session.id },
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Header activeTab="MY" />
      <main className="register-page">
        <ProgramRegisterForm
          mode="edit"
          spaces={spaces}
          initial={program}
        />
      </main>
      <Footer />
    </>
  );
}
