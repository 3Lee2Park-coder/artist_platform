import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { QuestionResponseForm } from "@/components/QuestionResponseForm";
import { loadQuestionResponseByRawToken } from "@/lib/question-response";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "질문에 답하기",
  robots: { index: false, follow: false }
};

type PageProps = {
  params: Promise<{ token: string }>;
};

function ResponseShell({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="section question-response-page">
        <article className="register-card wide">
          <p className="eyebrow">Ask</p>
          <h1>{title}</h1>
          {children}
        </article>
      </main>
      <Footer />
    </>
  );
}

export default async function QuestionResponsePage({ params }: PageProps) {
  const { token } = await params;
  const loaded = await loadQuestionResponseByRawToken(token);

  if ("error" in loaded) {
    return (
      <ResponseShell title="이 링크를 열 수 없어요">
        <p className="exhibition-ask-error" role="alert">
          {loaded.error}
        </p>
        <p className="exhibition-ask-hint">
          링크가 만료되었거나 이미 쓰였을 수 있어요. OOOF.에 새 링크를 요청해 주세요.
        </p>
      </ResponseShell>
    );
  }

  const { view, expiresAt } = loaded;

  return (
    <ResponseShell title="궁금증에 답해 주세요">
      <p className="auth-description">
        로그인 없이 답할 수 있어요. 답은 먼저 질문한 분만 보고, 전시에 공개할지는 OOOF.가
        따로 살펴봐요.
      </p>
      <dl className="exhibition-ask-context">
        <div>
          <dt>전시</dt>
          <dd>{view.exhibitionTitle}</dd>
        </div>
        <div>
          <dt>작가</dt>
          <dd>{view.artistName}</dd>
        </div>
        {view.workTitle ? (
          <div>
            <dt>작품</dt>
            <dd>{view.workTitle}</dd>
          </div>
        ) : null}
        <div>
          <dt>질문한 분</dt>
          <dd>{view.askerLabel}</dd>
        </div>
      </dl>
      <h2 className="my-question-heading">질문</h2>
      <p className="my-question-body">{view.questionText}</p>
      <QuestionResponseForm token={token} expiresAt={expiresAt} />
    </ResponseShell>
  );
}
