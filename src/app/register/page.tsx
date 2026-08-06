import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession, isApprovedArtist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "등록 허브 | Sokkup"
};

export default async function RegisterHubPage() {
  const session = await getSession();
  const approved = Boolean(session && isApprovedArtist(session));

  const artistStatus = session
    ? (
        await prisma.user.findUnique({
          where: { id: session.id },
          select: { artistStatus: true }
        })
      )?.artistStatus ?? "NONE"
    : "NONE";

  const ownedSpaceCount =
    session && approved
      ? await prisma.space.count({ where: { ownerUserId: session.id } })
      : 0;

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
    program: approved ? (ownedSpaceCount > 0 ? "ready" : "need-space") : "locked"
  } as const;

  return (
    <>
      <Header activeTab="등록" />
      <main className="register-page">
        <section className="register-card wide">
          <div className="register-b2b-banner">
            <p className="register-b2b-kicker">For artists &amp; spaces</p>
            <p className="register-b2b-headline">
              Grow Your Space.
              <br />
              Show Your Work. Reach Further.
            </p>
            <p className="register-b2b-lead">
              단순한 등록이 아닙니다. 작품을 직접 보여주고, 동네를 걷는 관객과의
              연결을 넓히세요. 작업이 있는 곳을 열어 비즈니스의 다음 단계를
              만들어가세요.
            </p>
          </div>

          <p className="eyebrow">작가 등록</p>
          <h1 className="register-hub-title">한 번에 하나씩, 순서대로</h1>
          <p className="auth-description">
            단계를 따라가면 됩니다. 작가 승인 후 공간 → 전시·프로그램 순으로 열 수
            있습니다. 공간·프로그램은 관리자 검수 뒤 공개됩니다.
          </p>
          <p className="field-hint">
            서비스를 먼저 이해하고 싶다면{" "}
            <Link href="/for-artists">작가로 열기 안내</Link>를 읽어 보세요.
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
                <span className="status-pill ok">{session.name}님 로그인됨</span>
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
                방문 정책(워크인/예약)을 정확히 적어 주세요.
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
              <p>기간이 있는 전시와 작가와의 대화 예약을 설정합니다.</p>
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
                오픈 스튜디오·워크숍 등.{" "}
                {ownedSpaceCount === 0 && approved
                  ? "본인 공간이 필요하니 먼저 공간을 등록해 주세요."
                  : "본인 공간에 연결합니다."}
              </p>
              {approved && ownedSpaceCount > 0 ? (
                <Link className="primary-button" href="/register/program">
                  프로그램 등록하기
                </Link>
              ) : approved ? (
                <Link className="secondary-button" href="/register/space">
                  먼저 공간 등록
                </Link>
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
