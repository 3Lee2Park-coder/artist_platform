import { curationSeo, curationShareImages, publicMeta } from "@/lib/seo";
import { getCurationById } from "@/lib/exhibitions";
import { permanentRedirect } from "next/navigation";

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
    images: curationShareImages(curation)
  });
}

export default async function CurationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/decks/${id}`);
}
