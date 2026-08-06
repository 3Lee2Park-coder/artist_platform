"use client";

import {
  MyExhibitionLibrary,
  type ReservationLibraryItem,
  type SavedLibraryItem,
  type VisitedLibraryItem
} from "@/components/MyExhibitionLibrary";
import { ShareActionButton } from "@/components/ShareActionButton";
import { VisitArchiveSection } from "@/components/VisitArchiveSection";
import type { VisitArchiveEntry } from "@/lib/visit-archive";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ReservationItem = {
  id: string;
  visitDate: string;
  slot: string;
  status: string;
  exhibition: {
    id: string;
    title: string;
    venue: string;
    district: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

type ExhibitionItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  _count?: { reservations: number };
};

type SpaceItem = {
  id: string;
  slug: string;
  name: string;
  status: string;
  type: string;
  district: string;
  _count?: { programs: number; exhibitions: number };
};

type ProgramItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  space?: { id: string; name: string; slug: string } | null;
};

type SlotSummary = {
  exhibitionId: string;
  exhibitionTitle: string;
  visitDate: string;
  slot: string;
  count: number;
  reservations: ReservationItem[];
};

type Stat = {
  totalVisited: number;
  thisYear: number;
  thisMonth: number;
  topGenre: { label: string; count: number } | null;
  topRegion: { label: string; count: number } | null;
};

type MyPageDashboardProps = {
  userName: string;
  email: string;
  role: string;
  artistStatus: string;
  isArtist: boolean;
  isAdmin: boolean;
  today: string;
  interestTags: string[];
  visitPurposes: string[];
  stats: Stat;
  recommendCount: number;
  savedExhibitions: SavedLibraryItem[];
  visitedExhibitions: VisitedLibraryItem[];
  libraryReservations: ReservationLibraryItem[];
  artistExhibitions: ExhibitionItem[];
  artistSpaces: SpaceItem[];
  artistPrograms: ProgramItem[];
  artistSlotSummary: SlotSummary[];
  artistReservations: ReservationItem[];
  visitArchive: VisitArchiveEntry[];
};

const statusLabel: Record<string, string> = {
  CONFIRMED: "예약 확정",
  ATTENDED: "방문 완료",
  NO_SHOW: "노쇼",
  CANCELLED: "취소됨"
};

const roleLabel: Record<string, string> = {
  MEMBER: "일반 회원",
  ARTIST: "작가",
  GALLERY: "갤러리",
  ADMIN: "운영자"
};

export function MyPageDashboard({
  userName,
  email,
  role,
  artistStatus,
  isArtist,
  isAdmin,
  today,
  interestTags,
  visitPurposes,
  stats,
  recommendCount,
  savedExhibitions,
  visitedExhibitions,
  libraryReservations,
  artistExhibitions,
  artistSpaces,
  artistPrograms,
  artistSlotSummary,
  artistReservations,
  visitArchive
}: MyPageDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"member" | "artist">(isArtist ? "member" : "member");
  const [message, setMessage] = useState("");

  async function updateReservationStatus(id: string, status: string) {
    const response = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "상태 변경에 실패했습니다.");
      return;
    }

    setMessage("예약 상태가 업데이트되었습니다.");
    router.refresh();
  }

  async function cancelReservation(id: string) {
    await updateReservationStatus(id, "CANCELLED");
  }

  async function shareArchive() {
    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareText = `${userName}님의 전시 아카이브 — 올해 ${stats.thisYear}개 관람`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "내 전시 아카이브", text: shareText, url: shareUrl });
        return;
      } catch {
        // 사용자가 취소한 경우 무시
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setMessage("공유 문구가 클립보드에 복사되었습니다.");
    } catch {
      setMessage("공유를 지원하지 않는 환경입니다.");
    }
  }

  const activeExhibitions = artistExhibitions.filter((item) => item.endDate >= today);
  const pastExhibitions = artistExhibitions.filter((item) => item.endDate < today);

  function exposureLabel(exhibition: ExhibitionItem) {
    if (exhibition.status !== "PUBLISHED") {
      return { text: "비공개/검수", tone: "warn" as const };
    }
    if (exhibition.startDate > today) {
      return { text: "예정 · 홈·검색에 노출", tone: "ok" as const };
    }
    if (exhibition.endDate < today) {
      return { text: "종료 · 목록 미노출", tone: "muted" as const };
    }
    return { text: "노출 중 · 홈·검색", tone: "ok" as const };
  }

  return (
    <main className="my-page">
      <section className="register-card wide my-page-header">
        <p className="eyebrow">My page</p>
        <h1>{userName}님</h1>
        <dl className="my-info-grid">
          <div>
            <dt>이메일</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>역할</dt>
            <dd>{roleLabel[role] ?? role}</dd>
          </div>
          <div>
            <dt>작가 상태</dt>
            <dd>{artistStatus}</dd>
          </div>
        </dl>

        <div className="taste-summary">
          <div>
            <span className="taste-label">관심 분야</span>
            {interestTags.length > 0 ? (
              <div className="taste-chip-row">
                {interestTags.map((tag) => (
                  <span key={tag} className="taste-chip static">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <Link href="/onboarding" className="text-link">
                관람 취향 설정하기
              </Link>
            )}
          </div>
          <div>
            <span className="taste-label">방문 목적</span>
            {visitPurposes.length > 0 ? (
              <div className="taste-chip-row">
                {visitPurposes.map((tag) => (
                  <span key={tag} className="taste-chip static">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <Link href="/onboarding" className="text-link">
                방문 목적 설정하기
              </Link>
            )}
          </div>
          <Link href="/onboarding" className="secondary-button self-start">
            취향 수정
          </Link>
        </div>

        <div className="my-tabs">
          <button
            type="button"
            className={tab === "member" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("member")}
          >
            내 전시 라이프
          </button>
          {isArtist ? (
            <button
              type="button"
              className={tab === "artist" ? "my-tab active" : "my-tab"}
              onClick={() => setTab("artist")}
            >
              작가 관리
            </button>
          ) : null}
          {isAdmin ? (
            <Link href="/admin" className="my-tab">
              관리자 페이지
            </Link>
          ) : null}
        </div>

        {message ? <p className="form-success">{message}</p> : null}
      </section>

      {tab === "member" && (
        <>
          <section className="register-card wide my-section my-archive-summary">
            <div className="my-archive-summary-copy">
              <p className="eyebrow">My archive</p>
              <h2>{userName}님의 전시 취향</h2>
              <p className="auth-description">
                올해 {stats.thisYear}개를 관람했고, {recommendCount}개 전시를 추천했어요.
                {stats.topGenre ? ` 주로 ${stats.topGenre.label}` : ""}
                {stats.topRegion ? ` · ${stats.topRegion.label} 전시` : ""}를 찾고 있어요.
              </p>
              {interestTags.length > 0 ? (
                <div className="taste-chip-row">
                  {interestTags.slice(0, 4).map((tag) => (
                    <span key={tag} className="taste-chip static">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <Link href="/onboarding" className="text-link">
                  관람 취향 설정하기
                </Link>
              )}
            </div>
            <div className="my-archive-summary-stats">
              <div className="summary-stat">
                <span>올해 관람</span>
                <strong>{stats.thisYear}</strong>
              </div>
              <div className="summary-stat">
                <span>추천</span>
                <strong>{recommendCount}</strong>
              </div>
              <div className="summary-stat">
                <span>저장</span>
                <strong>{savedExhibitions.length}</strong>
              </div>
              <div className="summary-stat">
                <span>예약</span>
                <strong>{libraryReservations.length}</strong>
              </div>
            </div>
          </section>

          <section className="register-card wide my-section">
            <VisitArchiveSection entries={visitArchive} userName={userName} />
          </section>

          <MyExhibitionLibrary
            today={today}
            reservations={libraryReservations}
            savedExhibitions={savedExhibitions}
            visitedExhibitions={visitedExhibitions}
            onCancelReservation={cancelReservation}
            onShareArchive={shareArchive}
          />

          {!isArtist ? (
            <section className="register-card wide my-section">
              <h2>작가 등록</h2>
              <p className="auth-description">전시를 등록하려면 작가 승인 신청이 필요합니다.</p>
              <div className="hub-actions">
                <Link className="secondary-button" href="/register/artist">
                  작가 승인 신청
                </Link>
              </div>
            </section>
          ) : null}
        </>
      )}

      {isArtist && tab === "artist" && (
        <div className="my-artist-workspace">
          <div className="register-b2b-banner my-artist-growth">
            <p className="register-b2b-kicker">Grow together</p>
            <p className="register-b2b-headline">
              Grow Your Space.
              <br />
              Show Your Work. Reach Further.
            </p>
            <p className="register-b2b-lead">
              우리와 함께 성장해 보세요. 공간·전시·프로그램을 직접 열고, 동네를 걷는
              관객과의 연결을 넓혀 갑니다.
            </p>
            <div className="hub-actions my-artist-growth-actions">
              <Link className="primary-button" href="/register">
                등록 허브 열기
              </Link>
              <Link className="secondary-button" href="/for-artists">
                작가 안내 보기
              </Link>
            </div>
          </div>

          {(artistSpaces.length > 0 ||
            artistExhibitions.length > 0 ||
            artistPrograms.length > 0) && (
            <section className="my-artist-block ownership-notice">
              <p className="eyebrow">연결된 항목</p>
              <h2>운영이 연결한 공간·전시를 여기서 관리할 수 있습니다</h2>
              <p className="auth-description">
                대리 등록 후 소유권이 연결된 항목도 아래에 표시됩니다. 사진·방문
                정책·일정을 확인해 주세요.
              </p>
            </section>
          )}

          <section className="my-artist-block">
            <div className="my-section-heading">
              <div>
                <h2>새 등록</h2>
                <p className="auth-description">
                  공간·전시·프로그램을 올릴 수 있습니다. 공간과 프로그램은 검수 후
                  공개됩니다.
                </p>
              </div>
              <div className="hub-actions">
                <Link className="secondary-button" href="/register/space">
                  공간 등록
                </Link>
                <Link className="secondary-button" href="/register/program">
                  프로그램 등록
                </Link>
                <Link className="primary-button" href="/register/exhibition">
                  전시 등록
                </Link>
              </div>
            </div>
          </section>

          <section className="my-artist-block">
            <div className="my-section-heading">
              <div>
                <h2>내 공간</h2>
                <p className="auth-description">
                  등록한 공방·쇼룸을 수정합니다. DRAFT는 관리자 검수 후 공개됩니다.
                </p>
              </div>
            </div>
            {artistSpaces.length > 0 ? (
              <div className="my-list">
                {artistSpaces.map((space) => (
                  <article key={space.id} className="my-list-card">
                    <div>
                      <h3>{space.name}</h3>
                      <p>
                        {space.district} · {space.type} · {space.status}
                      </p>
                      <span className="status-pill ok">
                        프로그램 {space._count?.programs ?? 0} · 전시{" "}
                        {space._count?.exhibitions ?? 0}
                      </span>
                    </div>
                    <div className="hub-actions">
                      {space.status === "PUBLISHED" ? (
                        <Link className="secondary-button" href={`/spaces/${space.slug}`}>
                          보기
                        </Link>
                      ) : null}
                      <Link
                        className="primary-button"
                        href={`/my/spaces/${space.id}/edit`}
                      >
                        수정
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">등록된 공간이 없습니다.</div>
            )}
          </section>

          <section className="my-artist-block">
            <div className="my-section-heading">
              <div>
                <h2>내 프로그램</h2>
                <p className="auth-description">
                  오픈 스튜디오·작가 대화 일정을 수정합니다.
                </p>
              </div>
            </div>
            {artistPrograms.length > 0 ? (
              <div className="my-list">
                {artistPrograms.map((program) => (
                  <article key={program.id} className="my-list-card">
                    <div>
                      <h3>{program.title}</h3>
                      <p>
                        {program.space?.name ?? "공간"} · {program.startDate} -{" "}
                        {program.endDate} · {program.status}
                      </p>
                    </div>
                    <div className="hub-actions">
                      {program.status === "PUBLISHED" ? (
                        <Link
                          className="secondary-button"
                          href={`/programs/${program.slug}`}
                        >
                          보기
                        </Link>
                      ) : null}
                      <Link
                        className="primary-button"
                        href={`/my/programs/${program.id}/edit`}
                      >
                        수정
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">등록된 프로그램이 없습니다.</div>
            )}
          </section>

          <section className="my-artist-block">
            <div className="my-section-heading">
              <div>
                <h2>내 전시</h2>
                <p className="auth-description">등록한 전시를 수정하거나 새 전시를 등록합니다.</p>
              </div>
            </div>

            <h3 className="my-subtitle">진행 중 / 예정</h3>
            {activeExhibitions.length > 0 ? (
              <div className="my-list">
                {activeExhibitions.map((exhibition) => {
                  const exposure = exposureLabel(exhibition);
                  return (
                  <article key={exhibition.id} className="my-list-card">
                    <div>
                      <h3>{exhibition.title}</h3>
                      <p>
                        {exhibition.startDate} - {exhibition.endDate}
                      </p>
                      <span
                        className={
                          exposure.tone === "ok"
                            ? "status-pill ok"
                            : exposure.tone === "warn"
                              ? "status-pill warn"
                              : "status-pill"
                        }
                      >
                        {exposure.text}
                      </span>
                      <span className="status-pill">
                        예약 {exhibition._count?.reservations ?? 0}건
                      </span>
                    </div>
                    <div className="hub-actions">
                      <Link className="secondary-button" href={`/exhibitions/${exhibition.id}`}>
                        보기
                      </Link>
                      <ShareActionButton
                        label="홍보 링크"
                        title={`${exhibition.title} 예약 안내`}
                        text={`${exhibition.title} 전시를 확인하고 방문 예약해보세요.`}
                        path={`/share/exhibitions/${exhibition.id}?from=artist`}
                        eventType="ARTIST_SHARE"
                        exhibitionId={exhibition.id}
                        source="artist_dashboard"
                      />
                      <Link
                        className="primary-button"
                        href={`/my/exhibitions/${exhibition.id}/edit`}
                      >
                        수정
                      </Link>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">등록된 진행 전시가 없습니다.</div>
            )}

            <h3 className="my-subtitle">종료된 전시</h3>
            {pastExhibitions.length > 0 ? (
              <div className="my-list">
                {pastExhibitions.map((exhibition) => (
                  <article key={`past-${exhibition.id}`} className="my-list-card muted">
                    <div>
                      <h3>{exhibition.title}</h3>
                      <p>
                        {exhibition.startDate} - {exhibition.endDate}
                      </p>
                    </div>
                    <div className="hub-actions">
                      <Link className="secondary-button" href={`/exhibitions/${exhibition.id}`}>
                        아카이브 보기
                      </Link>
                      <ShareActionButton
                        label="공유"
                        title={`${exhibition.title} 전시 아카이브`}
                        text={`${exhibition.title} 전시 아카이브를 확인해보세요.`}
                        path={`/share/exhibitions/${exhibition.id}?from=artist`}
                        eventType="ARTIST_SHARE"
                        exhibitionId={exhibition.id}
                        source="artist_dashboard_past"
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">종료된 전시가 없습니다.</div>
            )}
          </section>

          <section className="my-artist-block">
            <h2>예약 현황</h2>
            <p className="auth-description">시간대별 예약 인원과 방문/노쇼 상태를 관리합니다.</p>

            {artistSlotSummary.length > 0 ? (
              <div className="slot-summary-list">
                {artistSlotSummary.map((slot) => (
                  <article
                    key={`${slot.exhibitionId}-${slot.visitDate}-${slot.slot}`}
                    className="slot-summary-card"
                  >
                    <div className="slot-summary-head">
                      <strong>{slot.exhibitionTitle}</strong>
                      <span>
                        {slot.visitDate} · {slot.slot}
                      </span>
                      <em>{slot.count}명 예약</em>
                    </div>
                    <ul className="slot-guest-list">
                      {slot.reservations.map((reservation) => (
                        <li key={reservation.id}>
                          <div>
                            <strong>{reservation.user?.name}</strong>
                            <span>{reservation.user?.email}</span>
                            <span className={`status-pill ${reservationStatusClass(reservation.status)}`}>
                              {statusLabel[reservation.status] ?? reservation.status}
                            </span>
                          </div>
                          <div className="hub-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => updateReservationStatus(reservation.id, "ATTENDED")}
                            >
                              방문 완료
                            </button>
                            <button
                              type="button"
                              className="secondary-button warn-button"
                              onClick={() => updateReservationStatus(reservation.id, "NO_SHOW")}
                            >
                              노쇼
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">아직 접수된 예약이 없습니다.</div>
            )}
          </section>

          <section className="my-artist-block">
            <h2>전체 예약 로그</h2>
            {artistReservations.length > 0 ? (
              <div className="my-table-wrap">
                <table className="my-table">
                  <thead>
                    <tr>
                      <th>전시</th>
                      <th>예약자</th>
                      <th>일시</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artistReservations.map((reservation) => (
                      <tr key={`log-${reservation.id}`}>
                        <td>{reservation.exhibition.title}</td>
                        <td>
                          {reservation.user?.name}
                          <br />
                          <small>{reservation.user?.email}</small>
                        </td>
                        <td>
                          {reservation.visitDate} {reservation.slot}
                        </td>
                        <td>{statusLabel[reservation.status] ?? reservation.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">예약 로그가 없습니다.</div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function reservationStatusClass(status: string) {
  if (status === "ATTENDED") return "ok";
  if (status === "NO_SHOW") return "warn";
  if (status === "CANCELLED") return "";
  return "ok";
}
