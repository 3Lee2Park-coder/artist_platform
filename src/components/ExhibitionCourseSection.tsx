"use client";

import { trackProductEvent } from "@/lib/client-analytics";
import Link from "next/link";

type CourseCard = {
  id: string;
  title: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  coverTone: string;
  neighborhood: string | null;
  durationText: string | null;
  stopCount: number;
};

type NearbyStopCard = {
  id: string;
  kind: "EXHIBITION" | "PLACE";
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
  tone: string | null;
  distanceText: string;
  badge: string | null;
};

type ExhibitionCourseSectionProps = {
  exhibitionId: string;
  courses: CourseCard[];
  nextStops: NearbyStopCard[];
  source: "course" | "nearby" | "none";
};

export function ExhibitionCourseSection({
  exhibitionId,
  courses,
  nextStops,
  source
}: ExhibitionCourseSectionProps) {
  if (source === "none" && courses.length === 0) return null;

  const primary = courses[0] ?? null;
  const heading =
    source === "course"
      ? "이 코스의 다음 장소"
      : "이 근처에서 이어서";
  const eyebrow = source === "course" ? "Same course" : "Nearby";
  const desc =
    source === "course"
      ? "같은 덱에 묶인 다음 스톱입니다. 순서를 지키지 않아도 됩니다."
      : "도보 약 15분 안쪽의 진행 중 전시와 장소입니다.";

  return (
    <section className="detail-section exhibition-course-section" id="course-next">
      {primary ? (
        <article className="exhibition-course-lead">
          <div
            className="exhibition-course-lead-media"
            style={
              primary.coverImageUrl
                ? { backgroundImage: `url(${primary.coverImageUrl})` }
                : { background: primary.coverTone }
            }
            aria-hidden
          />
          <div className="exhibition-course-lead-copy">
            <p className="eyebrow">이 전시를 담은 코스</p>
            <h2>{primary.title}</h2>
            <p>
              {primary.subtitle ||
                (primary.neighborhood
                  ? `${primary.neighborhood} · ${primary.stopCount}곳`
                  : `${primary.stopCount}곳 코스`)}
              {primary.durationText ? ` · ${primary.durationText}` : ""}
            </p>
            <Link
              href={`/decks/${primary.id}?open=1`}
              className="primary-button"
              onClick={() =>
                void trackProductEvent({
                  type: "RELATED_DECK_CLICK",
                  exhibitionId,
                  source: "course_lead",
                  metadata: {
                    deckId: primary.id,
                    curationId: primary.id,
                    action: "open_deck",
                    href: `/decks/${primary.id}?open=1`
                  }
                })
              }
            >
              코스 펼쳐보기
            </Link>
            {courses.length > 1 ? (
              <ul className="exhibition-course-more">
                {courses.slice(1).map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/decks/${course.id}`}
                      onClick={() =>
                        void trackProductEvent({
                          type: "RELATED_DECK_CLICK",
                          exhibitionId,
                          source: "course_more",
                          metadata: {
                            deckId: course.id,
                            curationId: course.id,
                            href: `/decks/${course.id}`
                          }
                        })
                      }
                    >
                      {course.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>
      ) : null}

      {nextStops.length > 0 ? (
        <div className="exhibition-course-stops">
          <div className="section-header">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h2>{heading}</h2>
              <p className="exhibition-course-desc">{desc}</p>
            </div>
          </div>
          <div className="exhibition-course-rail">
            {nextStops.map((stop, index) => (
              <Link
                key={stop.id}
                href={stop.href}
                className="exhibition-course-card"
                onClick={() =>
                  void trackProductEvent({
                    type: source === "course" ? "DECK_STOP_CLICK" : "RELATED_COURSE_CLICK",
                    exhibitionId,
                    source: source === "course" ? "course_stop" : "nearby_stop",
                    metadata: {
                      deckId: primary?.id ?? null,
                      curationId: primary?.id ?? null,
                      stopId: stop.id,
                      stopIndex: index,
                      targetId: stop.id,
                      kind: stop.kind,
                      href: stop.href
                    }
                  })
                }
              >
                <span
                  className="exhibition-course-thumb"
                  style={
                    stop.imageUrl
                      ? { backgroundImage: `url(${stop.imageUrl})` }
                      : stop.tone
                        ? { background: stop.tone }
                        : undefined
                  }
                />
                <span className="exhibition-course-meta">
                  <small>
                    {stop.kind === "EXHIBITION" ? "전시" : "장소"} · {stop.distanceText}
                    {stop.badge ? ` · ${stop.badge}` : ""}
                  </small>
                  <strong>{stop.title}</strong>
                  {stop.subtitle ? <em>{stop.subtitle}</em> : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
