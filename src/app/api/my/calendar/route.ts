import { getSession } from "@/lib/auth";
import {
  addCalendarEntry,
  addMonths,
  getCalendarMonth,
  getWeekendPreview,
  removeCalendarEntry,
  shareCalendarDay
} from "@/lib/calendar-archive";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["CARD", "DECK"]),
  cardKey: z.string().min(3).optional(),
  deckId: z.string().min(4).optional()
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const url = new URL(request.url);
  const weekendOnly = url.searchParams.get("weekend") === "1";

  try {
    if (weekendOnly) {
      const preview = await getWeekendPreview(session.id);
      return NextResponse.json({ user: true, preview });
    }
    const month =
      url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const data = await getCalendarMonth(session.id, month);
    return NextResponse.json({ user: true, ...data, prevMonth: addMonths(month, -1), nextMonth: addMonths(month, 1) });
  } catch (error) {
    console.error("calendar GET", error);
    return NextResponse.json({ error: "달력을 불러오지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "날짜와 카드 또는 덱을 골라 주세요." }, { status: 400 });
  }
  try {
    const row = await addCalendarEntry(session.id, parsed.data);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    console.error("calendar POST", error);
    return NextResponse.json({ error: "달력에 담지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "항목이 없습니다." }, { status: 400 });
  }
  const ok = await removeCalendarEntry(session.id, id);
  return NextResponse.json({ ok });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "날짜가 필요합니다." }, { status: 400 });
  }
  try {
    const share = await shareCalendarDay(session.id, body.data.date);
    return NextResponse.json({
      path: `/share/days/${share.shareToken}`,
      shareToken: share.shareToken
    });
  } catch (error) {
    console.error("calendar share", error);
    return NextResponse.json({ error: "공유 링크를 만들지 못했습니다." }, { status: 500 });
  }
}
