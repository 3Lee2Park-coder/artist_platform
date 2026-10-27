import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { displayName, getSession, isApprovedArtist } from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "등록 허브"
};

function startOfMonthKST(today: string) {
  return new Date(`${today.slice(0, 7)}-01T00:00:00+09:00`);
}

export default async function RegisterHubPage() {
  const session = await getSession();
  const approved = Boolean(session && isApprovedArtist(session));
  const artistStatus = session?.artistStatus ?? "NONE";
  const today = getTodayKST();
  const monthStart = startOfMonthKST(today);

  const [pageOpens, openedShows, publicSpaces] = await Promise.all([
    prisma.eventLog.count({
      where: { type: "EXHIBITION_VIEW", createdAt: { gte: monthStart } }
    }),
    prisma.eventLog.groupBy({
      by: ["exhibitionId"],
      where: {
        type: "EXHIBITION_VIEW",
        createdAt: { gte: monthStart },
        exhibitionId: { not: null }
      }
    }),
    prisma.space.count({
      where: { status: "PUBLISHED", isPublic: true }
    })
  ]);
  const openedShowCount = openedShows.length;

  const ownedSpaceCount =
    session && approved
      ? await prisma.space.count({ where: { ownerUserId: session.id } })
      : 0;

  const activeExhibitionCount =
    session && approved
      ? await prisma.exhibition.count({
          where: {
            registeredById: session.id,
            source: { not: "PUBLIC_API" },
            status: { in: ["PUBLISHED", "DRAFT"] },
            endDate: { gte: today }
          }
        })
      : 0;

  const canRegisterProgram = ownedSpaceCount > 0 || activeExhibitionCount > 0;

  const stepState = {
    account: Boolean(session),
    artist:
      artistStatus === "APPROVED"
        ? "done"
        : artistStatus === "PENDING"
          ? "pending"
          : session
            ? "ready"
            : "locked",
    space: approved ? "ready" : "locked",
    exhibition: approved ? "ready" : "locked",
    program: approved ? (canRegisterProgram ? "ready" : "need-venue") : "locked"
  } as const;

  return (
    <>
      <Header activeTab="등록" />
      <main className="register-page">
        <section className="register-card wide">
          <header className="register-landing">
            <h1 className="register-hub-title">
              관객들에게 더 많은 전시를 보여주세요.
            </h1>
            <p className="register-b2b-lead">
              전시 등록은 무료입니다. 승인 뒤 공간과 전시를 올리면 전시 목록과
              지도에 노출됩니다. <span className="register-brand-word">OOOF.는</span> 그 전시가 관객에게 닿도록 자리를 엽니다.
            </p>
            <dl className="register-metrics">
              <div>
                <dt>이번 달 전시 페이지가 열린 횟수</dt>
                <dd>{pageOpens.toLocaleString("ko-KR")}</dd>
              </div>
              <div>
                <dt>이번 달 노출 중인 전시</dt>
                <dd>{openedShowCount.toLocaleString("ko-KR")}</dd>
              </div>
              <div>
                <dt>공개 중인 공간</dt>
                <dd>{publicSpaces.toLocaleString("ko-KR")}</dd>
              </div>
            </dl>
            {/* <p className="register-metric-note">
              첫 숫자는 월간 방문자 수가 아닙니다. 전시 페이지가 열린 횟수이고,
              그중 대부분은 아직 작가 본인 등록 전시가 아닙니다. 작가 등록 전시가
              적기 때문에, 지금 올리면 그 빈 자리에 들어갑니다.
            </p> */}
            <div className="register-landing-actions">
              {!session ? (
                <Link className="primary-button" href="/auth/signup?redirect=/register">
                  무료로 시작하기
                </Link>
              ) : approved ? (
                <Link className="primary-button" href="/register/exhibition">
                  전시 등록하기
                </Link>
              ) : (
                <Link className="primary-button" href="/register/artist">
                  작가 승인 신청
                </Link>
              )}
              <Link className="secondary-button" href="/for-artists">
                등록 전에 안내 보기
              </Link>
            </div>
          </header>

          <h2 className="register-steps-title">등록 순서</h2>
          <p className="auth-description">
            계정, 작가 승인, 공간, 전시 순입니다. 공간과 프로그램은 관리자 검수
            뒤 공개됩니다.
          </p>

          <ol className="register-progress">
            <li className={stepState.account ? "done" : "current"}>
              <span>1</span> 계정
            </li>
            <li
              className={
                stepState.artist === "done"
                  ? "done"
                  : stepState.artist === "pending" || stepState.artist === "ready"
                    ? "current"
                    : ""
              }
            >
              <span>2</span> 작가 승인
            </li>
            <li className={stepState.space === "ready" ? "current" : approved ? "done" : ""}>
              <span>3</span> 공간
            </li>
            <li className={approved ? "current" : ""}>
              <span>4</span> 전시·프로그램
            </li>
          </ol>

          <div className="register-hub-grid">
            <article className="hub-card">
              <p className="hub-card-step">Step 1</p>
              <h2>로그인 / 회원가입</h2>
              <p>예약·등록·MY 기록을 위한 통합 계정입니다.</p>
              {session ? (
                <span className="status-pill ok">
                  {displayName(session)}님 로그인됨
                </span>
              ) : (
                <div className="hub-actions">
                  <Link
                    className="primary-button"
                    href="/auth/login?redirect=/register"
                  >
                    로그인
                  </Link>
                  <Link
                    className="secondary-button"
                    href="/auth/signup?redirect=/register"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </article>

            <article className="hub-card">
              <p className="hub-card-step">Step 2</p>
              <h2>작가 승인 신청</h2>
              <p>간단한 소개·활동 지역만 제출하면 됩니다. 승인 후 등록이 열립니다.</p>
              {!session ? (
                <span className="status-pill">로그인 후 신청 가능</span>
              ) : artistStatus === "APPROVED" ? (
                <span className="status-pill ok">승인 완료 · 다음 단계로</span>
              ) : artistStatus === "PENDING" ? (
                <span className="status-pill warn">심사 중 · 보통 1–2일</span>
              ) : artistStatus === "REJECTED" ? (
                <div className="hub-actions">
                  <span className="status-pill warn">반려됨 · 다시 신청 가능</span>
                  <Link className="secondary-button" href="/register/artist">
                    다시 신청하기
                  </Link>
                </div>
              ) : (
                <Link className="primary-button" href="/register/artist">
                  작가 승인 신청
                </Link>
              )}
            </article>

            <article className="hub-card recommended">
              <p className="hub-card-step">Step 3 · 권장</p>
              <h2>공간 등록</h2>
              <p>
                공방·쇼룸을 먼저 올리면 프로그램·큐레이션에 연결하기 쉽습니다.
                방문 정책(워크인/예약)을 함께 입력해주세요.
              </p>
              {approved ? (
                <div className="hub-actions">
                  <Link className="primary-button" href="/register/space">
                    공간 등록하기
                  </Link>
                  {ownedSpaceCount > 0 ? (
                    <span className="status-pill ok">등록 {ownedSpaceCount}곳</span>
                  ) : null}
                </div>
              ) : (
                <span className="status-pill warn">승인 후 이용 가능</span>
              )}
            </article>

            <article className="hub-card">
              <p className="hub-card-step">Step 4a</p>
              <h2>전시 등록</h2>
              <p>무료 전시회 노출과 선택적으로 작가와의 대화 등 예약 기획을 입력할 수 있습니다.</p>
              {approved ? (
                <Link className="primary-button" href="/register/exhibition">
                  전시 등록하기
                </Link>
              ) : (
                <span className="status-pill warn">승인 후 이용 가능</span>
              )}
            </article>

            <article className="hub-card">
              <p className="hub-card-step">Step 4b</p>
              <h2>프로그램 등록</h2>
              <p>
                오픈 스튜디오·워크숍·작가와의 대화 등.{" "}
                {approved && !canRegisterProgram
                  ? "공간 또는 진행·예정 전시를 먼저 등록해 주세요."
                  : "내 공간 또는 진행·예정 전시에 연결합니다."}
              </p>
              {approved && canRegisterProgram ? (
                <Link className="primary-button" href="/register/program">
                  프로그램 등록하기
                </Link>
              ) : approved ? (
                <div className="hub-actions">
                  <Link className="secondary-button" href="/register/space">
                    공간 등록
                  </Link>
                  <Link className="secondary-button" href="/register/exhibition">
                    전시 등록
                  </Link>
                </div>
              ) : (
                <span className="status-pill warn">승인 후 이용 가능</span>
              )}
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
