import { prisma } from "@/lib/prisma";
import { shouldSkipAnalytics } from "@/lib/request-analytics";

export type EventLogType =
  | "EXHIBITION_VIEW"
  | "EXHIBITION_SHARE"
  | "EXHIBITION_ENGAGE"
  | "RELATED_COURSE_CLICK"
  | "RELATED_DECK_CLICK"
  | "DECK_STOP_CLICK"
  | "ARTIST_SHARE"
  | "VISIT_SHARE"
  | "CURATION_VIEW"
  | "CURATION_SHARE"
  // 도시락 KPI — 식판이 눈에 들어온 횟수 대비 열어 본 횟수
  | "DOSIRAK_IMPRESSION"
  | "DOSIRAK_OPEN"
  | "DECK_VIEW"
  | "DECK_OPEN"
  | "PLACE_CLICK"
  | "SAVE_CREATE"
  | "SAVE_REMOVE"
  | "VISIT_CREATE"
  | "VISIT_REMOVE"
  | "REVIEW_UPSERT"
  | "REVIEW_DELETE"
  | "RESERVATION_CREATE"
  | "RESERVATION_INTENT"
  | "SPACE_VIEW"
  | "SPACE_SHARE"
  | "PROGRAM_VIEW"
  | "PROGRAM_RESERVATION_CREATE"
  | "ARTIST_QUESTION_CREATE"
  | "ARTIST_QUESTION_ANSWER"
  | "ARTIST_QUESTION_MODERATE";

type EventMetadata = Record<string, string | number | boolean | null | undefined>;

type LogEventInput = {
  type: EventLogType;
  userId?: string | null;
  exhibitionId?: string | null;
  reservationId?: string | null;
  source?: string | null;
  metadata?: EventMetadata;
  /** 운영자 본인 트래픽은 집계에서 제외 */
  skipIfAdmin?: boolean;
  userRole?: string | null;
};

export async function logEvent({
  type,
  userId,
  exhibitionId,
  reservationId,
  source,
  metadata,
  skipIfAdmin = true,
  userRole
}: LogEventInput) {
  try {
    if (skipIfAdmin && userRole === "ADMIN") {
      return;
    }

    // userId만 있고 role이 안 넘어온 경우 DB에서 한 번 확인
    if (skipIfAdmin && userId && !userRole) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      if (user?.role === "ADMIN") return;
    }

    if (await shouldSkipAnalytics()) {
      return;
    }

    await prisma.eventLog.create({
      data: {
        type,
        userId: userId ?? null,
        exhibitionId: exhibitionId ?? null,
        reservationId: reservationId ?? null,
        source: source ?? null,
        metadata: JSON.stringify(metadata ?? {})
      }
    });
  } catch (error) {
    // Analytics should never block the product flow.
    console.error("Failed to write event log", error);
  }
}

export const EVENT_LABELS: Record<string, string> = {
  EXHIBITION_VIEW: "전시 상세 조회",
  EXHIBITION_SHARE: "전시 공유",
  EXHIBITION_ENGAGE: "전시 정보 확인",
  RELATED_COURSE_CLICK: "코스/근처 클릭",
  RELATED_DECK_CLICK: "관련 덱 클릭",
  DECK_STOP_CLICK: "덱 스톱 클릭",
  ARTIST_SHARE: "작가 홍보 공유",
  VISIT_SHARE: "방문 기록 공유",
  CURATION_VIEW: "큐레이션 조회",
  CURATION_SHARE: "큐레이션 공유",
  PLACE_CLICK: "거점 플레이스 클릭",
  DECK_VIEW: "덱 조회",
  DECK_OPEN: "덱 열기",
  DOSIRAK_IMPRESSION: "도시락 노출",
  DOSIRAK_OPEN: "도시락 열기",
  SAVE_CREATE: "저장",
  SAVE_REMOVE: "저장 취소",
  VISIT_CREATE: "다녀왔어요",
  VISIT_REMOVE: "방문 취소",
  REVIEW_UPSERT: "리뷰 작성/수정",
  REVIEW_DELETE: "리뷰 삭제",
  RESERVATION_CREATE: "예약 완료",
  RESERVATION_INTENT: "예약 클릭",
  SPACE_VIEW: "공간 조회",
  SPACE_SHARE: "공간 공유",
  PROGRAM_VIEW: "프로그램 조회",
  PROGRAM_RESERVATION_CREATE: "프로그램 예약",
  ARTIST_QUESTION_CREATE: "작가 질문",
  ARTIST_QUESTION_ANSWER: "작가 답변",
  ARTIST_QUESTION_MODERATE: "질문 검수"
};
