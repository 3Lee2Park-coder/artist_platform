import { getSession } from "@/lib/auth";
import { curationMetricsToCsv, getCurationMetrics } from "@/lib/curation-metrics";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const rows = await getCurationMetrics();
  const csv = curationMetricsToCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="curation-metrics-${stamp}.csv"`
    }
  });
}
