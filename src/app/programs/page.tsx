import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProgramCard } from "@/components/ProgramCard";
import {
  getActivePrograms,
  getProgramRemainingSeats,
  PROGRAM_TYPE_LABEL,
  type ProgramType
} from "@/lib/programs";

export const revalidate = 60;

export const metadata = {
  title: "작가 프로그램",
  description: "오픈 스튜디오·작가와의 대화·워크숍을 한곳에서 찾아보세요.",
  alternates: { canonical: "/programs" }
};

export default async function ProgramsPage() {
  const programs = await getActivePrograms();
  const remainingById = await getProgramRemainingSeats(
    programs.map((program) => program.id)
  );

  const types = Array.from(new Set(programs.map((program) => program.type)));

  return (
    <>
      <Header activeTab="홈" />

      <main className="page-shell program-directory-page">
        <header className="space-directory-header">
          <p className="eyebrow">Programs</p>
          <h1>작가를 직접 만나는 시간</h1>
          <p className="auth-description">
            오픈 스튜디오, 작가와의 대화, 워크숍 — 작가가 열어둔 프로그램을 예약하고
            참여하세요.
          </p>
        </header>

        {programs.length > 0 ? (
          types.map((type) => {
            const typedPrograms = programs.filter(
              (program) => program.type === type
            );
            return (
              <section
                key={type}
                className="space-directory-group"
                aria-label={PROGRAM_TYPE_LABEL[type as ProgramType]}
              >
                <h2 className="space-directory-district">
                  {PROGRAM_TYPE_LABEL[type as ProgramType]}
                  <small>{typedPrograms.length}개</small>
                </h2>
                <div className="program-grid">
                  {typedPrograms.map((program) => (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      remainingSeats={remainingById[program.id]}
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="empty-state">
            아직 열려 있는 프로그램이 없습니다. 곧 첫 프로그램이 열립니다.
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
