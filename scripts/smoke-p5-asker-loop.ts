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
  const member = await prisma.user.findFirst({
    where: { role: "MEMBER" },
    select: { id: true, email: true, name: true, nickname: true, artistStatus: true, role: true }
  });
  const exhibition = await prisma.exhibition.findFirst({
    where: { status: "PUBLISHED" },
    select: { id: true }
  });
  if (!admin || !member || !exhibition) throw new Error("fixtures missing");

  async function cookieFor(user: typeof admin) {
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      role: user.role,
      artistStatus: user.artistStatus
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(env.AUTH_SECRET));
    return `ooof_session=${token}`;
  }

  const adminCookie = await cookieFor(admin);
  const memberCookie = await cookieFor(member);

  const q = await prisma.question.create({
    data: {
      text: "P5 재방문 스모크 질문",
      status: "submitted",
      audience: "private",
      notifyOnAnswer: true,
      userId: member.id,
      contactEmail: member.email,
      exhibitionId: exhibition.id,
      recipients: { create: { recipientType: "ooof", contactChannel: "ops" } }
    }
  });

  const first = await fetch("http://127.0.0.1:3001/api/admin/intake-questions", {
    method: "PATCH",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ id: q.id, status: "sent" })
  });
  const firstBody = await first.json();
  console.log("deliver1", first.status, Boolean(firstBody.responseLink?.responseUrl));

  // already sent — previously 400; should issue again
  const second = await fetch("http://127.0.0.1:3001/api/admin/intake-questions", {
    method: "PATCH",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ id: q.id, status: "sent" })
  });
  const secondBody = await second.json();
  console.log("deliver2", second.status, secondBody.error ?? "ok", Boolean(secondBody.responseLink?.responseUrl));

  const issueOnly = await fetch("http://127.0.0.1:3001/api/admin/intake-questions", {
    method: "PATCH",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ id: q.id, issueToken: true })
  });
  const issued = await issueOnly.json();
  console.log("issueOnly", issueOnly.status, Boolean(issued.responseLink?.responseUrl));
  const raw = decodeURIComponent(String(issued.responseLink.responseUrl).split("/q/")[1]);

  const answer = await fetch(
    `http://127.0.0.1:3001/api/question-response/${encodeURIComponent(raw)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "재방문 안내를 위한 테스트 답변입니다." })
    }
  );
  console.log("answer", answer.status, await answer.json());

  const own = await fetch(`http://127.0.0.1:3001/my/questions/${q.id}`, {
    headers: { Cookie: memberCookie },
    redirect: "manual"
  });
  const ownText = await own.text();
  console.log("own page", own.status, {
    hasAnswer: ownText.includes("재방문 안내를 위한 테스트 답변"),
    hasStatus: ownText.includes("답변이 왔어요"),
    hasExhibitionCta: ownText.includes("이 전시에서 더 보기")
  });

  const other = await fetch(`http://127.0.0.1:3001/my/questions/${q.id}`, {
    headers: { Cookie: adminCookie },
    redirect: "manual"
  });
  const otherText = await other.text();
  console.log("other page", other.status, {
    blocked: other.status === 404 || /찾을 수 없|not found|404/i.test(otherText),
    leakedAnswer: otherText.includes("재방문 안내를 위한 테스트 답변")
  });

  const notice = await prisma.notice.findFirst({
    where: { userId: member.id, dedupeKey: `intake-answer:${q.id}` }
  });
  console.log("notice", Boolean(notice), notice?.href);

  const myPage = await fetch("http://127.0.0.1:3001/my", {
    headers: { Cookie: memberCookie }
  });
  const myText = await myPage.text();
  console.log("my inbox", myPage.status, {
    hasIntake: myText.includes("P5 재방문 스모크 질문"),
    hasStatusCopy: myText.includes("답변이 왔어요")
  });

  if (process.env.P8_SMOKE_CLEANUP === "1") {
    await prisma.questionAnswer.deleteMany({ where: { questionId: q.id } });
    await prisma.questionResponseToken.deleteMany({ where: { questionId: q.id } });
    await prisma.questionRecipient.deleteMany({ where: { questionId: q.id } });
    await prisma.questionNotification.deleteMany({ where: { questionId: q.id } }).catch(() => undefined);
    await prisma.notice.deleteMany({ where: { dedupeKey: `intake-answer:${q.id}` } }).catch(() => undefined);
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
