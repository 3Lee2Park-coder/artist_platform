import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { readFileSync } from "fs";

async function main() {
  const env = Object.fromEntries(
    readFileSync(".env", "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
      })
  );
  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      artistStatus: true,
      role: true
    }
  });
  const exhibition = await prisma.exhibition.findFirst({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true }
  });
  if (!admin || !exhibition) throw new Error("fixtures missing");

  const token = await new SignJWT({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    nickname: admin.nickname,
    role: admin.role,
    artistStatus: admin.artistStatus
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(env.AUTH_SECRET));
  const cookie = `ooof_session=${token}`;

  const marker = `P6-SMOKE-${Date.now()}`;
  const created = await prisma.question.create({
    data: {
      text: `${marker} 관람 시간이 어떻게 되나요?`,
      status: "answered",
      audience: "private",
      notifyOnAnswer: false,
      contactEmail: "p6-asker-secret@example.com",
      exhibitionId: exhibition.id,
      answers: {
        create: {
          text: `${marker} 화요일부터 일요일 10시부터 6시까지 열어요.`,
          visibility: "private"
        }
      }
    },
    include: { answers: true }
  });

  const zeroHtml = await fetch(`http://127.0.0.1:3001/exhibitions/${exhibition.id}`).then((r) =>
    r.text()
  );
  const zeroHas = zeroHtml.includes("이 전시에서 궁금했던 것") && zeroHtml.includes(marker);
  console.log("public0_block_hidden", !zeroHas, { leakedEmail: zeroHtml.includes("p6-asker-secret@example.com") });

  const publish = await fetch("http://127.0.0.1:3001/api/admin/intake-questions", {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ id: created.id, answerVisibility: "public" })
  });
  const publishBody = await publish.json();
  console.log("publish", publish.status, publishBody.question?.answer?.visibility);

  const oneHtml = await fetch(`http://127.0.0.1:3001/exhibitions/${exhibition.id}`).then((r) =>
    r.text()
  );
  console.log("public1_block", {
    title: oneHtml.includes("이 전시에서 궁금했던 것"),
    questionSnippet: oneHtml.includes("관람 시간이"),
    answerSnippet: oneHtml.includes("화요일부터 일요일"),
    emailHidden: !oneHtml.includes("p6-asker-secret@example.com"),
    collectActionsPresent: oneHtml.includes("저장") || oneHtml.includes("collect")
  });

  const extras = [];
  for (let i = 0; i < 3; i += 1) {
    extras.push(
      await prisma.question.create({
        data: {
          text: `${marker} 추가 질문 ${i + 1} `.repeat(8),
          status: "answered",
          audience: "private",
          exhibitionId: exhibition.id,
          answers: {
            create: {
              text: `${marker} 추가 답변 ${i + 1} `.repeat(10),
              visibility: "public"
            }
          }
        }
      })
    );
  }

  const { listPublicQuestionsForExhibition } = await import("../src/lib/public-questions");
  const listed = await listPublicQuestionsForExhibition(exhibition.id);
  const manyHtml = await fetch(`http://127.0.0.1:3001/exhibitions/${exhibition.id}`).then((r) =>
    r.text()
  );
  console.log("public3plus_capped", {
    listed: listed.length,
    atMost3: listed.length <= 3,
    hasEllipsis: manyHtml.includes("…"),
    title: manyHtml.includes("이 전시에서 궁금했던 것"),
    emailHidden: !manyHtml.includes("p6-asker-secret@example.com")
  });

  const unpublish = await fetch("http://127.0.0.1:3001/api/admin/intake-questions", {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ id: created.id, answerVisibility: "private" })
  });
  console.log("unpublish", unpublish.status);

  const ids = [created.id, ...extras.map((q) => q.id)];
  if (process.env.P8_SMOKE_CLEANUP === "1") {
    await prisma.questionAnswer.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.question.deleteMany({ where: { id: { in: ids } } });
  } else {
    console.log("cleanup_skipped", ids.length, "(set P8_SMOKE_CLEANUP=1 to delete)");
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
