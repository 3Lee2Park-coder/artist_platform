import { DeckExperience } from "@/components/DeckExperience";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { publicMeta } from "@/lib/seo";
import { getPublicUserDeck } from "@/lib/user-decks";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const deck = await getPublicUserDeck(id);
    if (!deck) {
      return { title: "덱을 찾을 수 없습니다", robots: { index: false } };
    }
    return {
      ...publicMeta({
        title: `${deck.title} — OOOF. 덱`,
        description: `${deck.createdByLabel}님이 묶어 둔 ${deck.cardCount}장의 발견입니다. 가입하지 않아도 이 덱만 펼쳐 볼 수 있습니다.`,
        canonical: `/share/decks/${id}`,
        images: [deck.coverImageUrl]
      }),
      robots: { index: false }
    };
  } catch {
    return { title: "덱", robots: { index: false } };
  }
}

export default async function ShareDeckPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  let deck = null;
  try {
    deck = await getPublicUserDeck(id);
  } catch (error) {
    console.error("getPublicUserDeck", error);
  }

  if (!deck) notFound();

  return (
    <>
      <Header />
      <main className="page-shell ooof-share-deck-page">
        <p className="ooof-share-guest-note">
          {deck.createdByLabel}님이 묶어 둔 덱입니다. 가입 없이 카드를 펼쳐 볼 수
          있습니다. 담기·다녀왔어요는 로그인하면 <strong>내 기록</strong>으로만
          남고, 이 덱을 수정하거나 다른 컬렉션을 볼 수는 없습니다.
        </p>
        <DeckExperience
          deck={deck}
          isLoggedIn={Boolean(session)}
          defaultOpen
          loginRedirect={`/share/decks/${id}`}
        />
      </main>
      <Footer />
    </>
  );
}
