import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProgramReservationWidget } from "@/components/ProgramReservationWidget";
import { StoryRenderer } from "@/components/StoryRenderer";
import { VisitToggleButton } from "@/components/VisitToggleButton";
import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { getProgramBySlug } from "@/lib/programs";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

type ProgramDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProgramDetailPageProps) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);

  if (!program) {
    return { title: "프로그램을 찾을 수 없습니다", robots: { index: false } };
  }

  return {
    title: program.title,
    description:
      program.summary ?? `${program.venue.name}에서 열리는 ${program.typeLabel}`,
    alternates: { canonical: `/programs/${program.slug}` }
  };
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  const session = await getSession();

  if (!program) {
    notFound();
  }

  await logEvent({
    type: "PROGRAM_VIEW",
    userId: session?.id,
    source: "program_detail",
    metadata: { programId: program.id, title: program.title }
  });

  const visited = session
    ? Boolean(
        await prisma.visit.findFirst({
          where: { userId: session.id, programId: program.id }
        })
      )
    : false;

  const heroStyle = program.heroImageUrl
    ? {
        backgroundImage: `url(${program.heroImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : { background: program.heroTone };

  return (
    <>
      <Header activeTab="홈" />

      <main className="detail-page program-detail-page">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">홈</Link>
          <span>/</span>
          <Link href="/programs">프로그램</Link>
          <span>/</span>
          <strong>{program.title}</strong>
        </nav>

        <section className="detail-hero">
          <div
            className="detail-hero-image"
            style={heroStyle}
            aria-label={`${program.title} 대표 이미지`}
          >
            <span className="source-badge official">{program.typeLabel}</span>
          </div>

          <ProgramReservationWidget
            program={program}
            isLoggedIn={Boolean(session)}
            userName={session?.name}
          />
        </section>

        <section className="detail-layout">
          <article className="detail-main-copy">
            <p className="eyebrow">{program.typeLabel}</p>
            <h1>{program.title}</h1>
            {program.summary ? (
              <p className="detail-summary">{program.summary}</p>
            ) : null}

            <dl className="detail-info-grid">
              {program.hostName ? (
                <div>
                  <dt>진행 작가</dt>
                  <dd>
                    {program.hostUserId ? (
                      <Link className="text-link" href={`/artists/${program.hostUserId}`}>
                        {program.hostName}
                      </Link>
                    ) : (
                      program.hostName
                    )}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>장소</dt>
                <dd>
                  {program.venue.href ? (
                    <Link className="text-link" href={program.venue.href}>
                      {program.venue.name}
                    </Link>
                  ) : (
                    program.venue.name
                  )}
                  {program.venue.floorOrUnit ? ` · ${program.venue.floorOrUnit}` : ""}
                </dd>
              </div>
              <div>
                <dt>기간</dt>
                <dd>
                  {formatDate(program.startDate)} - {formatDate(program.endDate)}
                </dd>
              </div>
              <div>
                <dt>참여 방식</dt>
                <dd>{program.reservationRequired ? "사전 예약제" : "자유 참여"}</dd>
              </div>
            </dl>

            <StoryRenderer
              title="프로그램 소개"
              storyJson={program.storyJson}
              description={program.description}
              imageUrls={program.imageUrls}
            />

            {program.exhibitionId ? (
              <p className="program-linked-exhibition">
                이 프로그램은{" "}
                <Link className="text-link" href={`/exhibitions/${program.exhibitionId}`}>
                  {program.exhibitionTitle ?? "연계 전시"}
                </Link>
                와 함께 진행됩니다.
              </p>
            ) : null}

            <div className="space-detail-actions">
              <VisitToggleButton
                target={{ kind: "program", programId: program.id }}
                isLoggedIn={Boolean(session)}
                initialVisited={visited}
                redirectPath={`/programs/${program.slug}`}
              />
            </div>
          </article>

          <aside className="detail-side-card">
            <h3>안내</h3>
            <ul>
              {program.venue.address ? <li>{program.venue.address}</li> : null}
              <li>
                {program.reservationRequired
                  ? "예약 확정 후 방문해주세요."
                  : "예약 없이 참여할 수 있습니다."}
              </li>
              {program.policyNote ? <li>{program.policyNote}</li> : null}
            </ul>
            {program.venue.href ? (
              <div className="share-action-stack">
                <Link className="secondary-button" href={program.venue.href}>
                  {program.venue.kind === "exhibition" ? "전시 상세 보기" : "공간 소개 보기"}
                </Link>
              </div>
            ) : null}
          </aside>
        </section>
      </main>

      <Footer />
    </>
  );
}
