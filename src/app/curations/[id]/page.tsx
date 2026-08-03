import { CurationDetailClient } from "@/components/CurationDetailClient";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { annotateViewerState, getCurationById, getPublishedCurations } from "@/lib/exhibitions";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const curation = await getCurationById(id);

  if (!curation) {
    return { title: "큐레이션을 찾을 수 없습니다 | Exhibit" };
  }

  return {
    title: `${curation.title} | Exhibit`,
    description: curation.description ?? curation.subtitle ?? undefined
  };
}

export default async function CurationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const curation = await getCurationById(id);

  if (!curation) {
    notFound();
  }

  const allCurations = await getPublishedCurations();
  const exhibitions = await annotateViewerState(curation.exhibitions, session?.id);

  return (
    <>
      <Header />
      <CurationDetailClient
        curation={curation}
        relatedCurations={allCurations}
        exhibitions={exhibitions}
        isLoggedIn={Boolean(session)}
      />
      <Footer />
    </>
  );
}
