import {
  syncCultureInfoExhibitions,
  syncSeoulMuseumOfArtExhibitions
} from "@/lib/culture-info-api";
import { syncPublicExhibitions } from "@/lib/culture-public-api";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      maxPages?: number;
      source?: "kcisa" | "cultureinfo" | "sema" | "all";
    };

    const source = body.source ?? "all";
    const maxPages = body.maxPages ?? 15;

    const summary: Record<string, unknown> = {};

    if (source === "kcisa" || source === "all") {
      summary.kcisa = await syncPublicExhibitions({ maxPages });
    }

    if (source === "cultureinfo" || source === "all") {
      // serviceTp=A 전시만 · 페이지당 10건 · 200페이지 ≈ 최대 ~2000건
      // 상세/HEAD 생략으로 봄데이처럼 DB에 미리 적재 후 빠르게 서빙
      summary.cultureInfo = await syncCultureInfoExhibitions({
        maxPages: body.maxPages ?? 200,
        serviceTp: "A",
        enrichDetails: false,
        fastImageTrust: true,
        activeOnly: true
      });
    }

    if (source === "sema") {
      summary.sema = await syncSeoulMuseumOfArtExhibitions({
        maxPages: body.maxPages ?? 20,
        enrichDetails: true,
        detailLimit: 40
      });
    }

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "공공 API 동기화 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
