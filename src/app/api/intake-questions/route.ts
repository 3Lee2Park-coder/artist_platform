import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createNotice, NOTICE_TYPES } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { prepareExhibitionAsk } from "@/lib/question-intake";
import { getAdminRecipients } from "@/lib/questions";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  exhibitionId: z.string().min(1),
  text: z.string(),
  notifyOnAnswer: z.boolean().optional(),
  contactEmail: z.string().email().optional()
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error =
      issue?.path[0] === "contactEmail"
        ? "이메일 형식을 확인해 주세요."
        : "입력값이 올바르지 않습니다.";
    return NextResponse.json({ error }, { status: 400 });
  }

  const session = await getSession();
  const exhibition = await prisma.exhibition.findUnique({
    where: { id: parsed.data.exhibitionId },
    select: { id: true, status: true }
  });

  if (!exhibition || exhibition.status !== "PUBLISHED") {
    return NextResponse.json({ error: "연결된 전시를 찾을 수 없습니다." }, { status: 404 });
  }

  const notifyOnAnswer = Boolean(parsed.data.notifyOnAnswer);
  const prepared = prepareExhibitionAsk({
    text: parsed.data.text,
    exhibitionId: exhibition.id,
    userId: session?.id ?? null,
    contactEmail: notifyOnAnswer
      ? (session?.email ?? parsed.data.contactEmail ?? null)
      : (parsed.data.contactEmail ?? null),
    artistId: null,
    recipientType: "ooof",
    notifyOnAnswer
  });

  if ("error" in prepared) {
    return NextResponse.json({ error: prepared.error }, { status: 400 });
  }

  let createdId: string;
  try {
    const created = await prisma.question.create({
      data: {
        contactEmail: prepared.question.contactEmail,
        text: prepared.question.text,
        status: "submitted",
        audience: "private",
        exhibition: { connect: { id: exhibition.id } },
        ...(prepared.question.userId
          ? { asker: { connect: { id: prepared.question.userId } } }
          : {}),
        recipients: {
          create: {
            recipientType: "ooof",
            contactChannel: "ops"
          }
        }
      },
      select: { id: true, status: true }
    });
    createdId = created.id;
    if (notifyOnAnswer) {
      await prisma.$executeRaw`
        UPDATE "Question" SET "notifyOnAnswer" = true WHERE "id" = ${created.id}
      `;
    }
    const admins = await getAdminRecipients();
    await Promise.all(
      admins.map((admin) =>
        createNotice({
          userId: admin.id,
          type: NOTICE_TYPES.INTAKE_QUESTION,
          title: "새 질문이 접수됐어요",
          body: prepared.question.text.slice(0, 140),
          href: `/admin?tab=questions&intake=${created.id}`,
          dedupeKey: `intake:${created.id}`
        })
      )
    );
  } catch (error) {
    console.error("intake question create failed", error);
    return NextResponse.json(
      { error: "질문을 보내지 못했습니다. 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  await logEvent({
    type: "ARTIST_QUESTION_CREATE",
    userId: session?.id ?? null,
    exhibitionId: exhibition.id,
    source: "exhibition_detail",
    metadata: {
      questionId: createdId,
      recipientType: "ooof",
      notifyOnAnswer: Boolean(parsed.data.notifyOnAnswer)
    }
  });

  return NextResponse.json({ ok: true, status: "submitted", id: createdId }, { status: 201 });
}
