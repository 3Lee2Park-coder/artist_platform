import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MyDeckEditor } from "@/components/MyDeckEditor";
import { getSession } from "@/lib/auth";
import { getUserDeckForOwner } from "@/lib/user-decks";
import { notFound, redirect } from "next/navigation";

export const metadata = {
  title: "MY DECK",
  robots: { index: false }
};

export default async function MyDeckPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login?redirect=/my");
  }

  const { id } = await params;
  let deck = null;
  try {
    deck = await getUserDeckForOwner(session.id, id);
  } catch (error) {
    console.error("getUserDeckForOwner", error);
  }

  if (!deck) notFound();

  return (
    <>
      <Header activeTab="MY" />
      <main className="page-shell ooof-my-deck-page">
        <MyDeckEditor deck={deck} isLoggedIn />
      </main>
      <Footer />
    </>
  );
}
