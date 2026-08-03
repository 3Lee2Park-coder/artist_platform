import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { NextResponse } from "next/server";
import { z } from "zod";

const eventSchema = z.object({
  type: z.enum([
    "EXHIBITION_SHARE",
    "ARTIST_SHARE",
    "VISIT_SHARE",
    "RESERVATION_INTENT",
    "CURATION_VIEW",
    "CURATION_SHARE",
    "PLACE_CLICK"
  ]),
  exhibitionId: z.string().min(1).optional(),
  reservationId: z.string().min(1).optional(),
  source: z.string().max(80).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

export async function POST(request: Request) {
  const session = await getSession();
  const parsed = eventSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  await logEvent({
    type: parsed.data.type,
    userId: session?.id,
    exhibitionId: parsed.data.exhibitionId,
    reservationId: parsed.data.reservationId,
    source: parsed.data.source,
    metadata: parsed.data.metadata
  });

  return NextResponse.json({ ok: true });
}
