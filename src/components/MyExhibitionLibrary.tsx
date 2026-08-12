"use client";

import { ShareActionButton } from "@/components/ShareActionButton";
import Link from "next/link";
import { useMemo, useState } from "react";

export type LibraryExhibition = {
  id: string;
  title: string;
  venue: string;
  district: string;
  region: string;
  heroImageUrl?: string;
  heroTone: string;
  curationAvailable: boolean;
};

export type ReservationLibraryItem = {
  id: string;
  visitDate: string;
  slot: string;
  status: string;
  exhibition: LibraryExhibition;
};

export type SavedLibraryItem = LibraryExhibition & {
  ended: boolean;
};

export type VisitedLibraryItem = LibraryExhibition & {
  visitId: string;
  visitedAt: string;
  recommend: boolean | null;
  moodTags: string[];
  memo: string | null;
  hadArtistTalk: boolean;
};

type LibraryTab = "upcoming" | "saved" | "visited";

type MyExhibitionLibraryProps = {
  today: string;
  reservations: ReservationLibraryItem[];
  savedExhibitions: SavedLibraryItem[];
  visitedExhibitions: VisitedLibraryItem[];
  onCancelReservation: (id: string) => void;
  onShareArchive: () => void;
};

const statusLabel: Record<string, string> = {
  CONFIRMED: "예약 확정",
  ATTENDED: "방문 완료",
  NO_SHOW: "노쇼",
  CANCELLED: "취소됨"
};

export function MyExhibitionLibrary({
  today,
  reservations,
  savedExhibitions,
  visitedExhibitions,
  onCancelReservation,
  onShareArchive
}: MyExhibitionLibraryProps) {
  const defaultTab = useMemo<LibraryTab>(() => {
    if (visitedExhibitions.length > 0) return "visited";
    if (reservations.length > 0) return "upcoming";
    return "saved";
  }, [visitedExhibitions.length, reservations.length]);

  const [libraryTab, setLibraryTab] = useState<LibraryTab>(defaultTab);

  return (
    <section className="register-card library-wide my-section">
      <div className="my-section-heading">
        <div>
          <h2>나의 전시 서재</h2>
          <p className="auth-description">
            저장, 예약, 방문까지 전시 라이프사이클을 한곳에서 관리합니다.
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onShareArchive}>
          아카이브 공유
        </button>
      </div>

      <div className="library-tabs" role="tablist" aria-label="전시 서재 탭">
        <button
          type="button"
          role="tab"
          className={libraryTab === "upcoming" ? "library-tab active" : "library-tab"}
          aria-selected={libraryTab === "upcoming"}
          onClick={() => setLibraryTab("upcoming")}
        >
          예약 예정 ({reservations.length})
        </button>
        <button
          type="button"
          role="tab"
          className={libraryTab === "saved" ? "library-tab active" : "library-tab"}
          aria-selected={libraryTab === "saved"}
          onClick={() => setLibraryTab("saved")}
        >
          찾아둔 전시 ({savedExhibitions.length})
        </button>
        <button
          type="button"
          role="tab"
          className={libraryTab === "visited" ? "library-tab active" : "library-tab"}
          aria-selected={libraryTab === "visited"}
          onClick={() => setLibraryTab("visited")}
        >
          찾아낸 전시 ({visitedExhibitions.length})
        </button>
      </div>

      {libraryTab === "upcoming" ? (
        reservations.length > 0 ? (
          <div className="archive-grid compact">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="archive-card upcoming">
                <PosterThumb exhibition={reservation.exhibition} />
                <div className="archive-card-body">
                  <div className="archive-badge-row">
                    <span className="status-pill ok">
                      {statusLabel[reservation.status] ?? reservation.status}
                    </span>
                    {reservation.exhibition.curationAvailable ? (
                      <span className="status-pill artist-talk">작가와 대화</span>
                    ) : null}
                  </div>
                  <h3>{reservation.exhibition.title}</h3>
                  <p>
                    {reservation.visitDate} · {reservation.slot}
                  </p>
                  <p className="archive-meta">
                    {reservation.exhibition.region} {reservation.exhibition.district} ·{" "}
                    {reservation.exhibition.venue}
                  </p>
                  <div className="archive-card-actions">
                    <Link
                      className="secondary-button"
                      href={`/exhibitions/${reservation.exhibition.id}`}
                    >
                      전시 보기
                    </Link>
                    {reservation.status === "CONFIRMED" && reservation.visitDate >= today ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onCancelReservation(reservation.id)}
                      >
                        예약 취소
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">예약된 전시가 없습니다.</div>
        )
      ) : null}

      {libraryTab === "saved" ? (
        savedExhibitions.length > 0 ? (
          <div className="archive-grid">
            {savedExhibitions.map((item) => (
              <article
                key={`saved-${item.id}`}
                className={item.ended ? "archive-card muted" : "archive-card"}
              >
                <Link href={`/exhibitions/${item.id}`} className="archive-card-link">
                  <PosterThumb exhibition={item} />
                  <div className="archive-card-body">
                    <div className="archive-badge-row">
                      <span className="status-pill">찾아둔 단서</span>
                      {item.curationAvailable ? (
                        <span className="status-pill artist-talk">작가와 대화</span>
                      ) : null}
                      {item.ended ? <span className="status-pill ended">종료</span> : null}
                    </div>
                    <h3>{item.title}</h3>
                    <p className="archive-meta">
                      {item.region} {item.district} · {item.venue}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">아직 찾아둔 전시가 없습니다.</div>
        )
      ) : null}

      {libraryTab === "visited" ? (
        visitedExhibitions.length > 0 ? (
          <div className="archive-grid">
            {visitedExhibitions.map((item) => (
              <article key={`visited-${item.visitId}`} className="archive-card visited">
                <Link href={`/exhibitions/${item.id}`} className="archive-card-link">
                  <PosterThumb exhibition={item} />
                  <div className="archive-card-body">
                    <div className="archive-badge-row">
                      {item.recommend ? (
                        <span className="recommend-pill up">👍 추천</span>
                      ) : item.recommend === false ? null : (
                        <span className="status-pill">리뷰 없음</span>
                      )}
                      {item.hadArtistTalk ? (
                        <span className="status-pill artist-talk">작가와 대화</span>
                      ) : null}
                    </div>
                    <h3>{item.title}</h3>
                    <p className="archive-date">{item.visitedAt}</p>
                    <p className="archive-meta">
                      {item.region} {item.district} · {item.venue}
                    </p>
                    {item.moodTags.length > 0 ? (
                      <div className="review-tags compact">
                        {item.moodTags.slice(0, 2).map((tag) => (
                          <span key={`${item.visitId}-${tag}`}>{tag}</span>
                        ))}
                      </div>
                    ) : null}
                    {item.memo ? <p className="archive-memo">{item.memo}</p> : null}
                  </div>
                </Link>
                <div className="archive-card-footer">
                  <Link className="text-link" href={`/exhibitions/${item.id}`}>
                    {item.recommend ? "리뷰 보기" : "리뷰 남기기"}
                  </Link>
                  <ShareActionButton
                    label="공유"
                    title={`${item.title} 찾기 기록`}
                    text={`${item.title} 전시를 찾아냈어요.`}
                    path={`/share/visits/${item.visitId}`}
                    eventType="VISIT_SHARE"
                    exhibitionId={item.id}
                    source="my_visit_grid"
                    className="text-link"
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">아직 찾아낸 전시가 없습니다.</div>
        )
      ) : null}
    </section>
  );
}

function PosterThumb({ exhibition }: { exhibition: LibraryExhibition }) {
  return (
    <div
      className="archive-poster"
      style={
        exhibition.heroImageUrl
          ? {
              backgroundImage: `url(${exhibition.heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }
          : { background: exhibition.heroTone }
      }
      aria-hidden="true"
    />
  );
}
