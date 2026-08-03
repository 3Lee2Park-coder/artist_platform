import { prisma } from "@/lib/prisma";

export type CurationMetricRow = {
  curationId: string;
  title: string;
  neighborhood: string | null;
  views: number;
  shares: number;
  placeClicks: number;
  exhibitionViews: number;
  saves: number;
};

function parseMetadata(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asCurationId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** EventLog metadata.curationId 기준 큐레이션별 집계 */
export async function getCurationMetrics(): Promise<CurationMetricRow[]> {
  const curations = await prisma.curation.findMany({
    select: { id: true, title: true, neighborhood: true },
    orderBy: { sortOrder: "asc" }
  });

  if (curations.length === 0) {
    return [];
  }

  const events = await prisma.eventLog.findMany({
    where: {
      type: {
        in: [
          "CURATION_VIEW",
          "CURATION_SHARE",
          "PLACE_CLICK",
          "EXHIBITION_VIEW",
          "SAVE_CREATE"
        ]
      }
    },
    select: { type: true, source: true, metadata: true }
  });

  const byId = new Map<string, CurationMetricRow>(
    curations.map((curation) => [
      curation.id,
      {
        curationId: curation.id,
        title: curation.title,
        neighborhood: curation.neighborhood,
        views: 0,
        shares: 0,
        placeClicks: 0,
        exhibitionViews: 0,
        saves: 0
      }
    ])
  );

  for (const event of events) {
    const meta = parseMetadata(event.metadata);
    const curationId = asCurationId(meta.curationId);
    if (!curationId) continue;

    const row = byId.get(curationId);
    if (!row) continue;

    if (event.type === "CURATION_VIEW") row.views += 1;
    if (event.type === "CURATION_SHARE") row.shares += 1;
    if (event.type === "PLACE_CLICK") row.placeClicks += 1;
    if (event.type === "EXHIBITION_VIEW" && event.source === "curation") {
      row.exhibitionViews += 1;
    }
    if (event.type === "SAVE_CREATE" && (event.source === "curation" || meta.from === "curation")) {
      row.saves += 1;
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.views - a.views);
}

export function curationMetricsToCsv(rows: CurationMetricRow[]): string {
  const header = [
    "curationId",
    "title",
    "neighborhood",
    "views",
    "shares",
    "placeClicks",
    "exhibitionViews",
    "saves"
  ];

  const lines = rows.map((row) =>
    [
      row.curationId,
      `"${row.title.replace(/"/g, '""')}"`,
      row.neighborhood ?? "",
      row.views,
      row.shares,
      row.placeClicks,
      row.exhibitionViews,
      row.saves
    ].join(",")
  );

  return [header.join(","), ...lines].join("\n");
}
