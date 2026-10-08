import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import { getAskerIntakeQuestionForUser } from "@/lib/asker-questions";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "내 질문",
  robots: { index: false, follow: false }
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MyQuestionDetailPage({ params }: PageProps) {
  const session = await getSession();
  const { id } = await params;
  if (!session) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/my/questions/${id}`)}`);
  }

  const data = await getAskerIntakeQuestionForUser(session.id, id);
  if (!data) {
    // 타 사용자 질문이거나 없는 ID — 존재 여부를 드러내지 않는다.
    notFound();
  }

  const { view, exhibition, relatedDecks } = data;

  return (
    <>
      <Header activeTab="MY" />
      <main className="section my-question-page">
        <p className="eyebrow">Ask</p>
        <h1>내 질문</h1>
        <p className="auth-description my-question-status" role="status">
          {view.statusMessage}
        </p>

        <article className="register-card wide">
          <dl className="exhibition-ask-context">
            {view.exhibitionTitle ? (
              <div>
                <dt>전시</dt>
                <dd>{view.exhibitionTitle}</dd>
              </div>
            ) : null}
            {view.exhibitionArtist ? (
              <div>
                <dt>작가</dt>
                <dd>{view.exhibitionArtist}</dd>
              </div>
            ) : null}
            {view.workTitle ? (
              <div>
                <dt>작품</dt>
                <dd>{view.workTitle}</dd>
              </div>
            ) : null}
          </dl>

          <h2 className="my-question-heading">질문</h2>
          <p className="my-question-body">{view.text}</p>

          {view.status === "answered" && view.answer ? (
            <>
              <h2 className="my-question-heading">답변</h2>
              <p className="my-question-answer my-question-body">{view.answer}</p>
              <p className="exhibition-ask-hint">
                이 답변은 지금 나만 볼 수 있어요. 전시에 공개할지는 OOOF.가 따로 살펴봐요.
              </p>
            </>
          ) : view.status === "sent" ? (
            <p className="exhibition-ask-hint my-question-waiting">
              질문을 전달했어요. 답변이 오면 알려드릴게요.
            </p>
          ) : view.status === "submitted" ? (
            <p className="exhibition-ask-hint my-question-waiting">질문을 보냈어요.</p>
          ) : null}

          {exhibition ? (
            <p className="my-question-cta">
              <Link className="primary-btn" href={`/exhibitions/${exhibition.id}`}>
                이 전시에서 더 보기
              </Link>
            </p>
          ) : null}
        </article>

        {relatedDecks.length > 0 ? (
          <section className="register-card wide my-question-related">
            <h2 className="my-question-heading">이어서 둘러볼 덱</h2>
            <p className="auth-description">같은 전시가 담긴 코스입니다.</p>
            <ul className="my-list">
              {relatedDecks.map((deck) => (
                <li key={deck.id} className="my-list-card">
                  <div>
                    <h3>{deck.title}</h3>
                    {deck.subtitle ? <p>{deck.subtitle}</p> : null}
                  </div>
                  <Link className="secondary-button" href={deck.href}>
                    덱 열기
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="my-question-back">
          <Link href="/my#inbox">질문 함으로 돌아가기</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
