import { ExhibitionEditForm } from "@/components/ExhibitionEditForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitionEditPage({ params }: EditPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/my");
  }

  if (!isApprovedArtist(session)) {
    redirect("/my");
  }

  const { id } = await params;
  const exhibition = await prisma.exhibition.findUnique({
    where: { id },
    include: { artworks: true }
  });

  if (!exhibition) {
    notFound();
  }

  if (exhibition.registeredById !== session.id && session.role !== "ADMIN") {
    redirect("/my");
  }

  const { artworks, ...exhibitionFields } = exhibition;

  return (
    <>
      <Header activeTab="MY" />
      <main className="register-page">
        <section className="register-card wide">
          <p className="eyebrow">Edit exhibition</p>
          <h1>전시 수정</h1>
          <p className="auth-description">{exhibition.title}</p>
          <ExhibitionEditForm
            exhibition={exhibitionFields}
            artworks={artworks.map((item) => ({
              id: item.id,
              title: item.title,
              material: item.material,
              price: item.price,
              imageUrl: item.imageUrl
            }))}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
