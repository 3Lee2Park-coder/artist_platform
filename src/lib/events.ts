import { prisma } from "@/lib/prisma";
import { shouldSkipAnalytics } from "@/lib/request-analytics";

export type EventLogType =
  | "EXHIBITION_VIEW"
  | "EXHIBITION_SHARE"
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
};

export async function logEvent({
  type,
  userId,
  exhibitionId,
  reservationId,
  source,
  metadata
}: LogEventInput) {
  try {
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
