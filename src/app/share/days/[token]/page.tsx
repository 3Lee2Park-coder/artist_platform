import { DeckExperience } from "@/components/DeckExperience";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { OoofCard } from "@/components/OoofCard";
import { getSession } from "@/lib/auth";
import { getPublicCalendarDay } from "@/lib/calendar-archive";
import { publicMeta } from "@/lib/seo";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  try {
    const day = await getPublicCalendarDay(token);
    if (!day) return { title: "코스를 찾을 수 없습니다", robots: { index: false } };
    return {
      ...publicMeta({
        title: `${day.date} 코스 — OOOF.`,
        description: `${day.ownerName}님이 ${day.date}에 담아 둔 발견입니다.`,
        canonical: `/share/days/${token}`,
        images: day.items.map((item) => item.imageUrl).filter(Boolean)
      }),
      robots: { index: false }
    };
  } catch {
    return { title: "코스", robots: { index: false } };
  }
}

export default async function ShareDayPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();
  let day = null;
  try {
    day = await getPublicCalendarDay(token);
  } catch (error) {
    console.error("getPublicCalendarDay", error);
  }
  if (!day) notFound();

  return (
    <>
      <Header />
      <main className="page-shell ooof-share-deck-page">
        <p className="ooof-share-guest-note">
          {day.ownerName}님이 {day.date}에 담아 둔 코스입니다. 가입 없이 펼쳐 볼 수
          있습니다.
        </p>
        {day.decks.map((deck) => (
          <DeckExperience
            key={deck.id}
            deck={deck}
            isLoggedIn={Boolean(session)}
            defaultOpen
            loginRedirect={`/share/days/${token}`}
          />
        ))}
        {day.cards.length > 0 ? (
          <div className="share-day-cards">
            {day.cards.map((card) => (
              <OoofCard key={card.key} card={card} catalog />
            ))}
          </div>
        ) : null}
        {day.decks.length === 0 && day.cards.length === 0 ? (
          <p>이 날짜에 공개할 카드가 없습니다.</p>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
