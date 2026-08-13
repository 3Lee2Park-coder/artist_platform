import { CurationDetailClient } from "@/components/CurationDetailClient";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { annotateViewerState, getCurationById, getPublishedCurations } from "@/lib/exhibitions";
import { curationJsonLd, curationSeo, publicMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const curation = await getCurationById(id);

  if (!curation) {
    return { title: "큐레이션을 찾을 수 없습니다", robots: { index: false } };
  }

  const seo = curationSeo(curation);
  const canonical = `/curations/${curation.id}`;
  return publicMeta({
    title: seo.title,
    description: seo.description,
    canonical,
    images: [curation.coverImageUrl]
  });
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
  const seo = curationSeo(curation);

  return (
    <>
      <JsonLd
        data={curationJsonLd({
          title: curation.title,
          description: seo.description,
          canonical: `/curations/${curation.id}`,
          neighborhood: curation.neighborhood,
          image: curation.coverImageUrl
        })}
      />
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
