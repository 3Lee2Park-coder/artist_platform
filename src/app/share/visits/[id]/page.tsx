import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ShareActionButton } from "@/components/ShareActionButton";
import { prisma } from "@/lib/prisma";
import { parseTasteArray } from "@/lib/taste";
import Link from "next/link";
import { notFound } from "next/navigation";

type VisitSharePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: VisitSharePageProps) {
  const { id } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      exhibition: { select: { title: true, summary: true, heroImageUrl: true } }
    }
  });

  if (!visit || !visit.exhibition) {
    return { title: "방문 기록 공유" };
  }

  return {
    title: `${visit.user.name}님의 ${visit.exhibition.title} 방문 기록`,
    description: visit.exhibition.summary,
    openGraph: {
      title: `${visit.user.name}님의 전시 기록`,
      description: visit.exhibition.summary,
      images: visit.exhibition.heroImageUrl ? [visit.exhibition.heroImageUrl] : undefined
    }
  };
}

export default async function VisitSharePage({ params }: VisitSharePageProps) {
  const { id } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      exhibition: true
    }
  });

  if (!visit || !visit.exhibition || !visit.exhibitionId) {
    notFound();
  }

  const review = await prisma.review.findUnique({
    where: {
      userId_exhibitionId: {
        userId: visit.userId,
        exhibitionId: visit.exhibitionId
      }
    }
  });

  const moodTags = parseTasteArray(review?.moodTags);
  const visitedDate = visit.visitedAt.toISOString().slice(0, 10);

  return (
    <>
      <Header activeTab="MY" />
      <main className="share-page">
        <section className="share-card visit-share-card">
          <div
            className="share-card-image"
            style={
              visit.exhibition.heroImageUrl
                ? {
                    backgroundImage: `url(${visit.exhibition.heroImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }
                : { background: visit.exhibition.heroTone }
            }
            aria-label={`${visit.exhibition.title} 대표 이미지`}
          >
            <span className="status-pill ok">다녀온 전시</span>
          </div>
          <div className="share-card-copy">
            <p className="eyebrow">Visit archive</p>
            <h1>{visit.user.name}님의 전시 기록</h1>
            <p className="share-lead">
              {visitedDate}, {visit.exhibition.venue}에서{" "}
              <strong>{visit.exhibition.title}</strong> 전시를 관람했어요.
            </p>

            {review?.memo ? <blockquote className="share-quote">“{review.memo}”</blockquote> : null}

            {moodTags.length > 0 ? (
              <div className="review-tags">
                {moodTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}

            <div className="share-cta-row">
              <Link className="primary-button" href={`/exhibitions/${visit.exhibitionId}`}>
                전시 보기
              </Link>
              <ShareActionButton
                label="기록 공유"
                title={`${visit.user.name}님의 전시 기록`}
                text={`${visit.user.name}님이 ${visit.exhibition.title} 전시를 다녀왔어요.`}
                path={`/share/visits/${visit.id}`}
                eventType="VISIT_SHARE"
                exhibitionId={visit.exhibitionId}
                source="visit_share_landing"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
