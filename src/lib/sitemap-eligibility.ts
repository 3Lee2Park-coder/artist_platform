import { curationToDeck } from "@/lib/decks";
import { computeLifecycle, type CurationSummary } from "@/lib/exhibitions";

/**
 * EXTENDED has no separate end date. computeLifecycle keeps that state after endDate,
 * so an extended show stays listable until the override is cleared or set to CANCELLED.
 */
export function isExhibitionListable(
  record: { startDate: string; endDate: string; lifecycleOverride: string | null },
  today?: string
) {
  const lifecycle = computeLifecycle(record, today);
  return lifecycle !== "ended" && lifecycle !== "cancelled";
}

export function isDeckListable(curation: CurationSummary, today?: string) {
  return curationToDeck(curation, 0, today).servable;
}
