import { ExhibitionCard } from "@/components/ExhibitionCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProgramCard } from "@/components/ProgramCard";
import { ShareActionButton } from "@/components/ShareActionButton";
import { StoryRenderer } from "@/components/StoryRenderer";
import { VisitToggleButton } from "@/components/VisitToggleButton";
import { getSession } from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import { logEvent } from "@/lib/events";
import { getAllExhibitions } from "@/lib/exhibitions";
import { getProgramRemainingSeats, getProgramsBySpaceId } from "@/lib/programs";
import { prisma } from "@/lib/prisma";
import { getSpaceBySlug } from "@/lib/spaces";
import { publicMeta, spaceSeo } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";

type SpaceDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const DAY_LABEL: Record<string, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일"
};

export async function generateMetadata({ params }: SpaceDetailPageProps) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);

  if (!space) {
    return { title: "공간을 찾을 수 없습니다", robots: { index: false } };
  }

  const seo = spaceSeo(space);
  return publicMeta({
    title: seo.title,
    description: seo.description,
    canonical: `/spaces/${space.slug}`
  });
}

export default async function SpaceDetailPage({ params }: SpaceDetailPageProps) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  const session = await getSession();

  if (!space) {
    notFound();
  }

  await logEvent({
    type: "SPACE_VIEW",
    userId: session?.id,
    source: "space_detail",
    metadata: { spaceId: space.id, name: space.name }
  });

  const today = getTodayKST();
  const allExhibitions = await getAllExhibitions();
  const spaceExhibitions = allExhibitions.filter(
    (exhibition) => exhibition.space?.id === space.id
  );
  const currentExhibitions = spaceExhibitions.filter(
    (exhibition) => exhibition.startDate <= today && exhibition.endDate >= today
  );
  const upcomingExhibitions = spaceExhibitions.filter(
    (exhibition) => exhibition.startDate > today
  );

  const programs = await getProgramsBySpaceId(space.id, today);
  const programRemaining = await getProgramRemainingSeats(
    programs.map((program) => program.id)
  );

  const visited = session
    ? Boolean(
        await prisma.visit.findFirst({
          where: { userId: session.id, spaceId: space.id }
        })
      )
    : false;

  const ownerExhibitions = space.owner
    ? allExhibitions
        .filter(
          (exhibition) =>
            exhibition.space?.id !== space.id &&
            exhibition.registeredById === space.owner?.id
        )
        .slice(0, 3)
    : [];

  const heroStyle = space.heroImageUrl
    ? {
        backgroundImage: `url(${space.heroImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const
      }
    : { background: space.heroTone };

  const openingEntries = Object.entries(space.openingHours);
  const mapSearchUrl = `https://map.naver.com/p/search/${encodeURIComponent(space.address)}`;

  return (
    <>
      <Header activeTab="공간" />

      <main className="detail-page space-detail-page">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">홈</Link>
          <span>/</span>
          <Link href="/spaces">작가의 공간</Link>
          <span>/</span>
          <strong>{space.name}</strong>
        </nav>

        <section className="space-detail-hero">
          <div
            className="space-detail-cover"
            style={heroStyle}
            aria-label={`${space.name} 대표 이미지`}
          >
            <span className={`space-visit-badge tone-${space.visitStatus.tone}`}>
              {space.visitStatus.label}
            </span>
          </div>

          <div className="space-detail-headline">
            <p className="eyebrow">
              {space.typeLabel} · {space.district}
            </p>
            <h1>{space.name}</h1>
            {space.owner ? (
              <p className="space-detail-artist">
                <Link href={`/artists/${space.owner.id}`} className="text-link">
                  {space.owner.name}
                </Link>
                {space.owner.discipline ? ` · ${space.owner.discipline}` : ""}
              </p>
            ) : null}
            {space.shortDescription ? (
              <p className="space-detail-summary">{space.shortDescription}</p>
            ) : null}

            <div className="space-detail-actions">
              <VisitToggleButton
                target={{ kind: "space", spaceId: space.id }}
                isLoggedIn={Boolean(session)}
                initialVisited={visited}
                redirectPath={`/spaces/${space.slug}`}
              />
              <ShareActionButton
                label="공간 공유"
                title={space.name}
                text={`${space.name} — ${space.district}의 작가 공간`}
                path={`/spaces/${space.slug}`}
                eventType="SPACE_SHARE"
                source="space_detail"
                metadata={{ spaceId: space.id }}
              />
            </div>
          </div>
        </section>

        <section className="detail-layout">
          <article className="detail-main-copy">
            <div className="space-visit-panel">
              <h2>방문 안내</h2>
              <p className={`space-visit-line tone-${space.visitStatus.tone}`}>
                {space.visitStatus.label}
              </p>
              {space.visitNotice ? (
                <p className="space-visit-notice">{space.visitNotice}</p>
              ) : null}
              {openingEntries.length > 0 ? (
                <dl className="space-hours-grid">
                  {openingEntries.map(([day, hours]) => (
                    <div key={day}>
                      <dt>{DAY_LABEL[day] ?? day}</dt>
                      <dd>{hours}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="field-hint">
                  운영 시간 정보가 아직 없습니다. 방문 전 확인을 권장합니다.
                </p>
              )}
            </div>

            <StoryRenderer
              title="공간 소개"
              storyJson={space.storyJson}
              description={space.description}
              imageUrls={space.imageUrls}
            />

            {space.owner ? (
              <div className="space-artist-panel">
                <h2>이 공간의 작가</h2>
                <div className="space-artist-card">
                  <div>
                    <strong>{space.owner.name}</strong>
                    {space.owner.discipline ? (
                      <span> · {space.owner.discipline}</span>
                    ) : null}
                    {space.owner.bio ? <p>{space.owner.bio}</p> : null}
                  </div>
                  <div className="hub-actions">
                    <Link
                      className="secondary-button"
                      href={`/artists/${space.owner.id}`}
                    >
                      작가 프로필
                    </Link>
                    {space.owner.instagramUrl ? (
                      <a
                        className="secondary-button"
                        href={space.owner.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        인스타그램
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </article>

          <aside className="detail-side-card">
            <h3>찾아가기</h3>
            <ul>
              <li>{space.address}</li>
              {space.floorOrUnit ? <li>{space.floorOrUnit}</li> : null}
              <li>
                {space.region} {space.district}
              </li>
            </ul>
            <div className="share-action-stack">
              <a
                className="secondary-button"
                href={mapSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                네이버 지도에서 길찾기
              </a>
              <Link className="secondary-button" href="/map?layer=space">
                지도에서 다른 공간 보기
              </Link>
            </div>
          </aside>
        </section>

        {currentExhibitions.length > 0 || upcomingExhibitions.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Exhibitions</p>
                <h2>이 공간에서 열리는 전시</h2>
              </div>
            </div>
            <div className="exhibition-grid">
              {[...currentExhibitions, ...upcomingExhibitions].map((exhibition) => (
                <ExhibitionCard
                  key={exhibition.id}
                  exhibition={exhibition}
                  compact
                />
              ))}
            </div>
          </section>
        ) : null}

        {programs.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Programs</p>
                <h2>이 공간의 프로그램</h2>
              </div>
            </div>
            <div className="program-card-rail">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  remainingSeats={programRemaining[program.id]}
                />
              ))}
            </div>
          </section>
        ) : null}

        {ownerExhibitions.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">More works</p>
                <h2>작가의 다른 전시</h2>
              </div>
            </div>
            <div className="exhibition-grid">
              {ownerExhibitions.map((exhibition) => (
                <ExhibitionCard
                  key={`owner-${exhibition.id}`}
                  exhibition={exhibition}
                  compact
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </>
  );
}
