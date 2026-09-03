import { getSession } from "@/lib/auth";
import {
  listNotices,
  markAllNoticesRead,
  markNoticeRead
} from "@/lib/notices";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const notices = await listNotices(session.id);
  return NextResponse.json({
    notices: notices.map((notice) => ({
      ...notice,
      readAt: notice.readAt?.toISOString() ?? null,
      createdAt: notice.createdAt.toISOString()
    }))
  });
}

const patchSchema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional()
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  if (parsed.data.all) {
    await markAllNoticesRead(session.id);
    return NextResponse.json({ ok: true });
  }

  if (!parsed.data.id) {
    return NextResponse.json({ error: "알림을 지정해 주세요." }, { status: 400 });
  }

  await markNoticeRead(session.id, parsed.data.id);
  return NextResponse.json({ ok: true });
}
