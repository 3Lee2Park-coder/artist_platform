import { ExhibitionCard } from "@/components/ExhibitionCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProgramCard } from "@/components/ProgramCard";
import { SpaceCard } from "@/components/SpaceCard";
import { getAllExhibitions } from "@/lib/exhibitions";
import {
  getProgramRemainingSeats,
  getPublicPrograms
} from "@/lib/programs";
import { prisma } from "@/lib/prisma";
import { getPublicSpaces } from "@/lib/spaces";
import { resolveMediaUrl } from "@/lib/storage-url";
import { notFound } from "next/navigation";

type ArtistPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ArtistPageProps) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, artistStatus: true }
  });

  if (!user || user.artistStatus !== "APPROVED") {
    return { title: "작가를 찾을 수 없습니다", robots: { index: false } };
  }

  return {
    title: `${user.name} 작가`,
    description: `${user.name} 작가의 공간·전시·프로그램. OOOF.(우프)에서 찾아 보세요.`,
    alternates: { canonical: `/artists/${id}` }
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      artistStatus: true,
      artistApplication: {
        select: {
          bio: true,
          discipline: true,
          activityArea: true,
          instagramUrl: true,
          portfolioUrl: true,
          profileImageUrl: true
        }
      }
    }
  });

  if (!user || user.artistStatus !== "APPROVED") {
    notFound();
  }

  const profile = user.artistApplication;
  const profileImage = resolveMediaUrl(profile?.profileImageUrl);

  const [allSpaces, allPrograms, allExhibitions] = await Promise.all([
    getPublicSpaces(),
    getPublicPrograms(),
    getAllExhibitions()
  ]);

  const spaces = allSpaces.filter((space) => space.owner?.id === user.id);
  const programs = allPrograms.filter(
    (program) => program.hostUserId === user.id && program.lifecycle !== "ended"
  );
  const programRemaining = await getProgramRemainingSeats(
    programs.map((program) => program.id)
  );
  const exhibitions = allExhibitions
    .filter((exhibition) => exhibition.artist === user.name)
    .slice(0, 6);

  return (
    <>
      <Header activeTab="공간" />

      <main className="page-shell artist-profile-page">
        <header className="artist-profile-header">
          <div
            className="artist-profile-avatar"
            style={
              profileImage
                ? {
                    backgroundImage: `url(${profileImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }
                : undefined
            }
            aria-hidden="true"
          >
            {!profileImage ? user.name.slice(0, 1) : null}
          </div>
          <div className="artist-profile-copy">
            <p className="eyebrow">Artist</p>
            <h1>{user.name}</h1>
            {profile?.discipline ? (
              <p className="artist-profile-discipline">{profile.discipline}</p>
            ) : null}
            {profile?.activityArea ? (
              <p className="artist-profile-area">주 활동 지역 · {profile.activityArea}</p>
            ) : null}
            {profile?.bio ? <p className="artist-profile-bio">{profile.bio}</p> : null}
            <div className="hub-actions">
              {profile?.instagramUrl ? (
                <a
                  className="secondary-button"
                  href={profile.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  인스타그램
                </a>
              ) : null}
              {profile?.portfolioUrl ? (
                <a
                  className="secondary-button"
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  포트폴리오
                </a>
              ) : null}
            </div>
          </div>
        </header>

        {spaces.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Spaces</p>
                <h2>작가의 공간</h2>
              </div>
            </div>
            <div className="space-grid">
              {spaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          </section>
        ) : null}

        {programs.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Programs</p>
                <h2>진행 중인 프로그램</h2>
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

        {exhibitions.length > 0 ? (
          <section className="detail-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">전시</p>
                <h2>작가의 전시</h2>
              </div>
            </div>
            <div className="exhibition-grid">
              {exhibitions.map((exhibition) => (
                <ExhibitionCard key={exhibition.id} exhibition={exhibition} compact />
              ))}
            </div>
          </section>
        ) : null}

        {spaces.length === 0 && programs.length === 0 && exhibitions.length === 0 ? (
          <div className="empty-state">아직 공개된 활동이 없습니다.</div>
        ) : null}
      </main>

      <Footer />
    </>
  );
}
