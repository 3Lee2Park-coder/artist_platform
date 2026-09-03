import { DeckArchive } from "@/components/DeckArchive";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { buildCuratedDecks, DECK_BRAND } from "@/lib/decks";
import { getPublishedCurations } from "@/lib/exhibitions";
import { publicMeta } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

const PAGE_TITLE = "서울 전시 발견 코스 — 전시와 동네 장소를 한 번에";
const PAGE_DESCRIPTION =
  "함께 둘러보기 좋은 전시·공간·동네 장소를 카드로 묶은 서울 전시 코스입니다.";

export function generateMetadata() {
  return publicMeta({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    canonical: "/decks"
  });
}

export default async function DecksIndexPage() {
  const curations = await getPublishedCurations();
  const decks = buildCuratedDecks(curations);
  const live = decks.filter((deck) => deck.servable);
  const closed = decks.filter((deck) => !deck.servable);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: absoluteUrl("/decks"),
          hasPart: live.slice(0, 20).map((deck) => ({
            "@type": "ItemList",
            name: deck.title,
            url: absoluteUrl(deck.href),
            numberOfItems: deck.cardCount
          }))
        }}
      />
      <Header activeTab="덱" />
      <main className="page-shell ooof-archive-page">
        <header className="ooof-archive-header">
          <p className="eyebrow">전시와 동네를 잇는 카드 코스</p>
          <h1>{DECK_BRAND.archiveTitle}</h1>
          <p className="ooof-archive-lead">{DECK_BRAND.tagline}</p>
        </header>
        {live.length === 0 && closed.length === 0 ? (
          <p className="auth-description">지금은 공개된 발견 코스가 없습니다. 곧 새 코스를 소개합니다.</p>
        ) : (
          <DeckArchive live={live} closed={closed} />
        )}
      </main>
      <Footer />
    </>
  );
}
