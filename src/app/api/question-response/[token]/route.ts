import { logEvent } from "@/lib/events";
import { submitQuestionResponse } from "@/lib/question-response";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const bodySchema = z.object({
  answer: z.string()
});

export async function POST(request: Request, context: RouteContext) {
  const { token: rawToken } = await context.params;
  if (!rawToken || rawToken.length < 16) {
    return NextResponse.json({ error: "유효하지 않은 답변 링크입니다." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "답변을 입력해 주세요." }, { status: 400 });
  }

  const result = await submitQuestionResponse(rawToken, parsed.data.answer);
  if ("error" in result) {
    // 원문 토큰은 로그·응답에 남기지 않는다.
    console.error("question-response submit failed", {
      reason: "reason" in result ? result.reason : "validation",
      status: result.status
    });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logEvent({
    type: "ARTIST_QUESTION_ANSWER",
    source: "question_response_token",
    metadata: { questionId: result.questionId }
  });

  return NextResponse.json({ ok: true });
}
