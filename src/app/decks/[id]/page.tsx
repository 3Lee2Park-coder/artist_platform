import { CurationDetailClient } from "@/components/CurationDetailClient";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { getSession } from "@/lib/auth";
import { annotateCards } from "@/lib/cards";
import { buildCuratedDecks } from "@/lib/decks";
import { getTodayKST } from "@/lib/date";
import { annotateViewerState, getCurationById, getPublishedCurations } from "@/lib/exhibitions";
import { curationJsonLd, curationSeo, publicMeta } from "@/lib/seo";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const curation = await getCurationById(id);
  if (!curation) {
    return { title: "덱을 찾을 수 없습니다", robots: { index: false } };
  }
  const seo = curationSeo(curation);
  return publicMeta({
    title: seo.title,
    description: seo.description,
    canonical: `/decks/${curation.id}`,
    images: [curation.coverImageUrl]
  });
}

export default async function DeckDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const curation = await getCurationById(id);
  if (!curation) notFound();

  const allCurations = await getPublishedCurations();
  const exhibitions = await annotateViewerState(curation.exhibitions, session?.id);
  const seo = curationSeo(curation);
  const found =
    buildCuratedDecks(allCurations, getTodayKST()).find((item) => item.id === curation.id) ??
    null;
  const deck = found
    ? { ...found, cards: await annotateCards(found.cards, session?.id) }
    : null;

  return (
    <>
      <JsonLd
        data={curationJsonLd({
          title: curation.title,
          description: seo.description,
          canonical: `/decks/${curation.id}`,
          neighborhood: curation.neighborhood,
          image: curation.coverImageUrl
        })}
      />
      <Header activeTab="덱" />
      <CurationDetailClient
        curation={curation}
        deck={deck}
        relatedCurations={allCurations}
        exhibitions={exhibitions}
        isLoggedIn={Boolean(session)}
      />
      <Footer />
    </>
  );
}
