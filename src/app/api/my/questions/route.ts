import { getSession } from "@/lib/auth";
import { displayName } from "@/lib/nickname";
import { prisma } from "@/lib/prisma";
import { OPERATOR_UNLISTED_NAME } from "@/lib/question-topics";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const questions = await prisma.artistQuestion.findMany({
    where: { fromUserId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      artist: { select: { name: true, nickname: true } }
    }
  });

  return NextResponse.json({
    questions: questions.map((question) => ({
      id: question.id,
      kind: question.kind,
      topic: question.topic,
      status: question.status,
      body: question.body,
      answer: question.answer,
      artistName:
        question.artist
          ? displayName(question.artist)
          : question.unlistedArtistName || OPERATOR_UNLISTED_NAME,
      createdAt: question.createdAt.toISOString(),
      answeredAt: question.answeredAt?.toISOString() ?? null
    }))
  });
}
