import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { readFileSync } from "fs";
import {
  createQuestionResponseToken,
  hashQuestionToken
} from "../src/lib/question-intake";

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
    select: { id: true, title: true, artist: true }
  });
  if (!admin || !exhibition) throw new Error("missing fixtures");

  const jwt = await new SignJWT({
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
  const cookie = `ooof_session=${jwt}`;

  const q = await prisma.question.create({
    data: {
      text: "P4 토큰 보안 스모크 질문입니다",
      status: "submitted",
      audience: "private",
      exhibitionId: exhibition.id,
      recipients: { create: { recipientType: "ooof", contactChannel: "ops" } }
    }
  });

  const issue = await fetch("http://127.0.0.1:3001/api/admin/intake-questions", {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ id: q.id, status: "sent" })
  });
  const issuedBody = await issue.json();
  console.log("issue", issue.status, {
    hasUrl: Boolean(issuedBody.responseLink?.responseUrl),
    urlHasToken: Boolean(issuedBody.responseLink?.responseUrl?.includes("/q/"))
  });

  const url = issuedBody.responseLink?.responseUrl as string | undefined;
  if (!url) throw new Error(`no response url: ${JSON.stringify(issuedBody)}`);
  const raw = decodeURIComponent(url.split("/q/")[1]);

  const tokens = await prisma.questionResponseToken.findMany({
    where: { questionId: q.id }
  });
  console.log(
    "db tokens",
    tokens.map((t) => ({
      storesRaw: t.tokenHash === raw,
      hashMatches: t.tokenHash === hashQuestionToken(raw),
      usedAt: t.usedAt
    }))
  );

  const page = await fetch(url);
  const pageText = await page.text();
  console.log("page", page.status, {
    hasQuestion: pageText.includes("P4 토큰 보안 스모크"),
    errorUi: /답변 링크를 열 수 없습니다/.test(pageText),
    leaksAdminEmail: pageText.includes(admin.email)
  });

  async function postAnswer(token: string, answer: string) {
    const res = await fetch(
      `http://127.0.0.1:3001/api/question-response/${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer })
      }
    );
    return { status: res.status, body: await res.json() };
  }

  console.log("empty", await postAnswer(raw, "   "));
  console.log("banned", await postAnswer(raw, "계좌로 입금해 주세요"));
  console.log("wrong", await postAnswer("not-a-real-token-xxxxxx", "정상 답변입니다"));
  const ok = await postAnswer(raw, "일요일 오후 6시까지 관람 가능합니다.");
  console.log("ok", ok.status, ok.body, "rawLeaked", JSON.stringify(ok.body).includes(raw));
  console.log("reuse", await postAnswer(raw, "두번째 시도"));

  const expiredTok = createQuestionResponseToken(
    new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  );
  await prisma.questionResponseToken.create({
    data: {
      questionId: q.id,
      tokenHash: expiredTok.tokenHash,
      expiresAt: expiredTok.expiresAt,
      usedAt: null
    }
  });
  await prisma.question.update({ where: { id: q.id }, data: { status: "sent" } });
  const expiredPage = await fetch(
    `http://127.0.0.1:3001/q/${encodeURIComponent(expiredTok.rawToken)}`
  );
  const expiredText = await expiredPage.text();
  console.log("expired page", expiredPage.status, /만료/.test(expiredText));

  const answers = await prisma.questionAnswer.findMany({ where: { questionId: q.id } });
  console.log(
    "answers",
    answers.map((a) => ({ visibility: a.visibility, text: a.text.slice(0, 40) }))
  );

  if (process.env.P8_SMOKE_CLEANUP === "1") {
    await prisma.questionAnswer.deleteMany({ where: { questionId: q.id } });
    await prisma.questionResponseToken.deleteMany({ where: { questionId: q.id } });
    await prisma.questionRecipient.deleteMany({ where: { questionId: q.id } });
    await prisma.question.delete({ where: { id: q.id } });
  } else {
    console.log("cleanup_skipped", q.id, "(set P8_SMOKE_CLEANUP=1 to delete)");
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
