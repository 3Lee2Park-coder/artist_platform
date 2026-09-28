/**
 * Browser analytics: EventLog (source of truth) + GA4/GTM (channel/device).
 *
 * Measurement inventory (loaded from root layout):
 * - GTM container: NEXT_PUBLIC_GTM_ID → default GTM-KB7FSQTQ
 * - GA4 property: NEXT_PUBLIC_GA_MEASUREMENT_ID → default G-C7TPEQPJVQ (canonical)
 * - Google Ads conversions: AW-… via GoogleAdsConversionTracker only
 *   (do not gtag('config') a second G- ID — that produced dual page_view / GA4-Config noise)
 *
 * Duplicate page_view prevention:
 * - gtag config uses send_page_view: false
 * - AnalyticsPageView fires page_view only after document.title is settled
 * - In GTM Admin: disable Enhanced Measurement “Page changes based on browser history”
 *   so History Change does not fire a second page_view with empty/stale title
 *
 * GA4 custom params also need Admin custom dimensions for standard reports.
 */

export type ClientEventType =
  | "EXHIBITION_ENGAGE"
  | "RELATED_COURSE_CLICK"
  | "RELATED_DECK_CLICK"
  | "DECK_STOP_CLICK"
  | "SAVE"
  | "SAVE_INTENT"
  | "EXHIBITION_SHARE"
  | "RESERVATION_INTENT"
  | "CURATION_VIEW"
  | "CURATION_SHARE"
  | "DECK_VIEW"
  | "DECK_OPEN"
  | "PLACE_CLICK"
  | "DOSIRAK_IMPRESSION"
  | "DOSIRAK_OPEN";

type TrackInput = {
  type: ClientEventType;
  exhibitionId?: string;
  reservationId?: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  /** Skip EventLog POST (e.g. SAVE already logged server-side as SAVE_CREATE) */
  gaOnly?: boolean;
};

type AnalyticsParamValue = string | number;

const EVENTLOG_TYPES = new Set<string>([
  "EXHIBITION_ENGAGE",
  "RELATED_COURSE_CLICK",
  "RELATED_DECK_CLICK",
  "DECK_STOP_CLICK",
  "EXHIBITION_SHARE",
  "RESERVATION_INTENT",
  "CURATION_VIEW",
  "CURATION_SHARE",
  "DECK_VIEW",
  "DECK_OPEN",
  "PLACE_CLICK",
  "DOSIRAK_IMPRESSION",
  "DOSIRAK_OPEN"
]);

function toSnakeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

function cleanMeta(
  metadata?: TrackInput["metadata"]
): Record<string, AnalyticsParamValue> {
  if (!metadata) return {};
  const next: Record<string, AnalyticsParamValue> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;
    const snake = toSnakeKey(key);
    if (typeof value === "boolean") {
      next[snake] = value ? "1" : "0";
    } else {
      next[snake] = value;
    }
  }
  return next;
}

function pushDataLayer(payload: Record<string, unknown>) {
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(payload);
}

function getGtag(): ((...args: unknown[]) => void) | undefined {
  return (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
}

function pageTypeFromPath(pathname: string): string {
  if (pathname.startsWith("/exhibitions/")) return "exhibition";
  if (pathname.startsWith("/decks/")) return "deck";
  if (pathname.startsWith("/places/")) return "place";
  if (pathname.startsWith("/share/")) return "share";
  if (pathname.startsWith("/admin")) return "admin";
  return "other";
}

function buildBaseParams(
  metadata: Record<string, AnalyticsParamValue>,
  input: TrackInput
): Record<string, AnalyticsParamValue> {
  const pathname = window.location?.pathname || "";
  const params: Record<string, AnalyticsParamValue> = {
    page_type: pageTypeFromPath(pathname),
    page_path: pathname,
    ...metadata
  };

  if (input.exhibitionId) {
    params.exhibition_id = input.exhibitionId;
    params.from_exhibition_id = input.exhibitionId;
    params.entity_id = input.exhibitionId;
  }
  if (input.reservationId) params.reservation_id = input.reservationId;
  if (input.source) {
    params.event_source = input.source;
    params.source = input.source;
  }

  const deckId =
    (typeof metadata.deck_id === "string" && metadata.deck_id) ||
    (typeof metadata.curation_id === "string" && metadata.curation_id) ||
    null;
  if (deckId) {
    params.deck_id = deckId;
    params.course_id = deckId;
  }
  if (typeof metadata.href === "string") {
    params.to_path = metadata.href;
  }
  if (typeof metadata.from_place_id === "string") {
    params.from_place_id = metadata.from_place_id;
  }

  return params;
}

/** GA4 / GTM only — no EventLog */
export function trackGaEvent(
  eventName: string,
  params: Record<string, AnalyticsParamValue> = {}
) {
  if (typeof window === "undefined") return;
  try {
    pushDataLayer({ event: eventName, ...params });
    const gtag = getGtag();
    if (typeof gtag === "function") {
      gtag("event", eventName, params);
    }
  } catch {
    // ignore GA failures
  }
}

export function trackPageView(input: {
  page_title: string;
  page_location: string;
  page_path: string;
}) {
  const title = input.page_title.trim();
  if (!title) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] page_view skipped — empty page_title", input.page_path);
    }
    return;
  }

  trackGaEvent("page_view", {
    page_title: title,
    page_location: input.page_location,
    page_path: input.page_path
  });
}

export function setAnalyticsUserProperties(
  props: Record<string, string | null | undefined>
) {
  if (typeof window === "undefined") return;
  try {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === "") continue;
      cleaned[key] = value;
    }
    if (Object.keys(cleaned).length === 0) return;

    pushDataLayer({ event: "user_properties_set", user_properties: cleaned });
    const gtag = getGtag();
    if (typeof gtag === "function") {
      gtag("set", "user_properties", cleaned);
    }
  } catch {
    // ignore
  }
}

export async function trackProductEvent(input: TrackInput) {
  const metadata = cleanMeta(input.metadata);
  const eventName = input.type.toLowerCase();
  const shouldLog = !input.gaOnly && EVENTLOG_TYPES.has(input.type);

  if (shouldLog) {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: input.type,
          exhibitionId: input.exhibitionId,
          reservationId: input.reservationId,
          source: input.source,
          metadata: input.metadata ? cleanMeta(input.metadata) : undefined
        }),
        keepalive: true
      });
    } catch {
      // analytics must never block UX
    }
  }

  try {
    if (typeof window === "undefined") return;
    const params = buildBaseParams(metadata, input);
    trackGaEvent(eventName, params);

    // Keep related_course_click for existing key-event continuity when opening a deck
    if (input.type === "RELATED_DECK_CLICK") {
      trackGaEvent("related_course_click", params);
    }
  } catch {
    // ignore GA failures
  }
}

/** Wait until document.title is non-empty and stable after a client navigation. */
export function settleDocumentTitle(options?: {
  previousTitle?: string;
  timeoutMs?: number;
}): Promise<string> {
  const previousTitle = options?.previousTitle ?? "";
  const timeoutMs = options?.timeoutMs ?? 2000;

  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve("");
      return;
    }

    const started = Date.now();
    let last = document.title;
    let stableSince = Date.now();

    const finish = (title: string) => {
      const trimmed = title.trim();
      if (
        process.env.NODE_ENV === "development" &&
        (!trimmed || trimmed === "OOOF." || trimmed === "OOOF")
      ) {
        console.warn(
          "[analytics] weak or missing document.title after navigation",
          window.location.pathname,
          JSON.stringify(trimmed)
        );
      }
      resolve(trimmed);
    };

    const tick = () => {
      const current = document.title;
      if (current !== last) {
        last = current;
        stableSince = Date.now();
      }

      const elapsed = Date.now() - started;
      const stableFor = Date.now() - stableSince;
      const changed = Boolean(previousTitle) && current !== previousTitle;
      const nonEmpty = current.trim().length > 0;
      const goodEnough =
        nonEmpty &&
        (changed || stableFor >= 120 || elapsed >= 400) &&
        stableFor >= 80;

      if (goodEnough || elapsed >= timeoutMs) {
        finish(current);
        return;
      }
      window.setTimeout(tick, 40);
    };

    tick();
  });
}
