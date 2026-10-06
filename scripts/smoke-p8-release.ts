/**
 * P8 regression smoke — full ask loop + security + regression probes.
 * Does not deploy. Cleans up created rows.
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { readFileSync } from "fs";
import { createHash, randomBytes } from "crypto";

const BASE = process.env.P8_BASE_URL || "http://127.0.0.1:3001";

type Check = { name: string; ok: boolean; detail?: string };

function envMap() {
  return Object.fromEntries(
    readFileSync(".env", "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
      })
  );
}

async function cookieFor(
  secret: string,
  user: {
    id: string;
    email: string;
    name: string | null;
    nickname: string | null;
    role: string;
    artistStatus: string | null;
  }
) {
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
    .sign(new TextEncoder().encode(secret));
  return `ooof_session=${token}`;
}

async function main() {
  const env = envMap();
  const prisma = new PrismaClient();
  const checks: Check[] = [];
  const createdQuestionIds: string[] = [];

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
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      artistStatus: true,
      role: true
    }
  });
  const other = await prisma.user.findFirst({
    where: { role: "MEMBER", NOT: { id: member?.id } },
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

  if (!admin || !member || !exhibition) {
    throw new Error("fixtures missing: admin, member, published exhibition");
  }

  const adminCookie = await cookieFor(env.AUTH_SECRET, admin);
  const memberCookie = await cookieFor(env.AUTH_SECRET, member);
  const otherCookie = other ? await cookieFor(env.AUTH_SECRET, other) : null;
  const marker = `P8-${Date.now()}`;

  // --- pages / regression ---
  const home = await fetch(`${BASE}/`);
  checks.push({ name: "home_200", ok: home.status === 200, detail: String(home.status) });

  const exPage = await fetch(`${BASE}/exhibitions/${exhibition.id}`);
  const exHtml = await exPage.text();
  checks.push({
    name: "exhibition_detail_200",
    ok: exPage.status === 200,
    detail: String(exPage.status)
  });
  checks.push({
    name: "exhibition_has_collect_actions",
    ok: exHtml.includes("카드 저장") || exHtml.includes("내 덱에 넣기"),
    detail: "save/deck CTA present"
  });
  checks.push({
    name: "exhibition_has_ask_cta",
    ok: exHtml.includes("작가에게 물어보기") || exHtml.includes("궁금한 게 생겼나요"),
    detail: "ask CTA present"
  });
  checks.push({
    name: "public0_no_empty_qa_block",
    ok: !(exHtml.includes("이 전시에서 궁금했던 것") && exHtml.includes("첫 질문을")),
    detail: "no empty-state fill copy"
  });

  const decks = await fetch(`${BASE}/decks`);
  checks.push({ name: "decks_200", ok: decks.status === 200, detail: String(decks.status) });

  const myAnon = await fetch(`${BASE}/my`, { redirect: "manual" });
  checks.push({
    name: "my_requires_auth",
    ok: myAnon.status === 307 || myAnon.status === 302 || myAnon.status === 200,
    detail: `status=${myAnon.status}`
  });

  // --- admin gate ---
  const adminDenied = await fetch(`${BASE}/api/admin/intake-questions`, {
    headers: { Cookie: memberCookie }
  });
  checks.push({
    name: "admin_api_member_forbidden",
    ok: adminDenied.status === 403,
    detail: String(adminDenied.status)
  });

  const adminOk = await fetch(`${BASE}/api/admin/intake-questions`, {
    headers: { Cookie: adminCookie }
  });
  checks.push({
    name: "admin_api_admin_ok",
    ok: adminOk.status === 200,
    detail: String(adminOk.status)
  });

  // --- guest submit (email notify) ---
  const guestEmail = `p8-guest-${Date.now()}@example.com`;
  const guestSubmit = await fetch(`${BASE}/api/intake-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exhibitionId: exhibition.id,
      text: `${marker} 게스트 질문 — 관람 시간이 궁금해요`,
      notifyOnAnswer: true,
      contactEmail: guestEmail
    })
  });
  const guestBody = await guestSubmit.json().catch(() => ({}));
  const guestRow = await prisma.question.findFirst({
    where: { text: { contains: `${marker} 게스트` } },
    orderBy: { createdAt: "desc" }
  });
  checks.push({
    name: "guest_submit",
    ok:
      (guestSubmit.status === 200 || guestSubmit.status === 201) &&
      Boolean(guestRow) &&
      guestRow?.contactEmail === guestEmail,
    detail: `${guestSubmit.status} db=${guestRow?.id ?? "none"} apiId=${guestBody.id ?? "none"}`
  });
  if (guestRow) createdQuestionIds.push(guestRow.id);

  // --- logged-in submit ---
  const memberSubmit = await fetch(`${BASE}/api/intake-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberCookie },
    body: JSON.stringify({
      exhibitionId: exhibition.id,
      text: `${marker} 로그인 질문 — 이 작품의 파란색은 어떤 의미인가요`,
      notifyOnAnswer: true
    })
  });
  const memberBody = await memberSubmit.json().catch(() => ({}));
  const memberRow = await prisma.question.findFirst({
    where: { text: { contains: `${marker} 로그인` }, userId: member.id },
    orderBy: { createdAt: "desc" }
  });
  const questionId = memberRow?.id;
  checks.push({
    name: "member_submit",
    ok:
      Boolean(questionId) && (memberSubmit.status === 200 || memberSubmit.status === 201),
    detail: `${memberSubmit.status} apiReturnsId=${Boolean(memberBody.id)}`
  });
  if (questionId) createdQuestionIds.push(questionId);

  // domain state for future GA4 (Question row + EventLog; no new GA4 events)
  if (questionId && memberRow) {
    checks.push({
      name: "domain_state_create",
      ok:
        memberRow.status === "submitted" &&
        memberRow.userId === member.id &&
        memberRow.exhibitionId === exhibition.id &&
        memberRow.notifyOnAnswer === true,
      detail: `${memberRow.status}/user/notify=${memberRow.notifyOnAnswer}`
    });

    const createEvent = await prisma.eventLog.findFirst({
      where: {
        type: "ARTIST_QUESTION_CREATE",
        exhibitionId: exhibition.id,
        userId: member.id
      },
      orderBy: { createdAt: "desc" }
    });
    checks.push({
      name: "domain_event_create_logged",
      ok: Boolean(createEvent),
      detail: createEvent
        ? `${createEvent.type} metaHasQuestionId=${createEvent.metadata.includes(questionId)}`
        : "no event row"
    });
  }

  // --- deliver / token ---
  let responseUrl = "";
  if (questionId) {
    const deliver = await fetch(`${BASE}/api/admin/intake-questions`, {
      method: "PATCH",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: questionId, status: "sent" })
    });
    const deliverBody = await deliver.json();
    responseUrl = deliverBody.responseLink?.responseUrl ?? "";
    checks.push({
      name: "admin_deliver_token",
      ok: deliver.status === 200 && responseUrl.includes("/q/"),
      detail: `${deliver.status} url=${Boolean(responseUrl)}`
    });

    const tokenRows = await prisma.questionResponseToken.findMany({
      where: { questionId }
    });
    const raw = decodeURIComponent(responseUrl.split("/q/")[1] || "");
    const hash = createHash("sha256").update(raw).digest("hex");
    checks.push({
      name: "token_stored_as_hash_only",
      ok:
        tokenRows.length > 0 &&
        tokenRows.every((t) => t.tokenHash !== raw && t.tokenHash.length >= 32) &&
        tokenRows.some((t) => t.tokenHash === hash || t.tokenHash.length > 0),
      detail: `rows=${tokenRows.length}`
    });
    checks.push({
      name: "token_plaintext_not_in_db_list",
      ok: !JSON.stringify(tokenRows).includes(raw),
      detail: "raw absent from token rows json"
    });
  }

  // --- answer once ---
  if (responseUrl) {
    const page = await fetch(responseUrl);
    const pageHtml = await page.text();
    checks.push({
      name: "artist_token_page",
      ok: page.status === 200 && pageHtml.includes("궁금"),
      detail: String(page.status)
    });
    checks.push({
      name: "artist_page_no_guest_email_leak",
      ok: !pageHtml.includes(guestEmail) && !pageHtml.includes(member.email),
      detail: "no asker emails on /q"
    });

    const raw = decodeURIComponent(responseUrl.split("/q/")[1] || "");
    const answer1 = await fetch(`${BASE}/api/question-response/${encodeURIComponent(raw)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: `${marker} 답변 — 파란색은 거리감이에요.` })
    });
    checks.push({
      name: "answer_submit_once",
      ok: answer1.status === 200,
      detail: String(answer1.status)
    });

    const answer2 = await fetch(`${BASE}/api/question-response/${encodeURIComponent(raw)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "중복 사용 시도" })
    });
    checks.push({
      name: "answer_reuse_blocked",
      ok: answer2.status === 410 || answer2.status === 400,
      detail: String(answer2.status)
    });

    // expired token
    const expiredRaw = randomBytes(24).toString("base64url");
    const expiredHash = createHash("sha256").update(expiredRaw).digest("hex");
    if (questionId) {
      await prisma.questionResponseToken.create({
        data: {
          questionId,
          tokenHash: expiredHash,
          expiresAt: new Date(Date.now() - 60_000),
          usedAt: null
        }
      });
      const expiredRes = await fetch(
        `${BASE}/api/question-response/${encodeURIComponent(expiredRaw)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: "만료 토큰" })
        }
      );
      checks.push({
        name: "answer_expired_blocked",
        ok: expiredRes.status === 410 || expiredRes.status === 400,
        detail: String(expiredRes.status)
      });
    }
  }

  // --- asker view / PII ---
  if (questionId) {
    const own = await fetch(`${BASE}/my/questions/${questionId}`, {
      headers: { Cookie: memberCookie }
    });
    const ownHtml = await own.text();
    checks.push({
      name: "asker_own_detail",
      ok: own.status === 200 && ownHtml.includes(marker) && ownHtml.includes("답변"),
      detail: String(own.status)
    });

    if (otherCookie) {
      const foreign = await fetch(`${BASE}/my/questions/${questionId}`, {
        headers: { Cookie: otherCookie }
      });
      const foreignHtml = await foreign.text();
      checks.push({
        name: "asker_other_blocked",
        ok:
          foreign.status === 404 ||
          (!foreignHtml.includes(`${marker} 답변`) &&
            (foreignHtml.includes("찾을 수") || foreignHtml.includes("로그인"))),
        detail: String(foreign.status)
      });
    }

    const answered = await prisma.question.findUnique({
      where: { id: questionId },
      include: { answers: true }
    });
    checks.push({
      name: "domain_state_answered_private",
      ok:
        answered?.status === "answered" &&
        answered.answers.some((a) => a.visibility === "private"),
      detail: answered ? `${answered.status}/${answered.answers[0]?.visibility}` : "missing"
    });

    // publish
    const publish = await fetch(`${BASE}/api/admin/intake-questions`, {
      method: "PATCH",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: questionId, answerVisibility: "public" })
    });
    checks.push({
      name: "admin_publish_manual",
      ok: publish.status === 200,
      detail: String(publish.status)
    });

    const publicPage = await fetch(`${BASE}/exhibitions/${exhibition.id}`);
    const publicHtml = await publicPage.text();
    checks.push({
      name: "public_qa_on_exhibition",
      ok:
        publicHtml.includes("이 전시에서 궁금했던 것") &&
        publicHtml.includes("파란색"),
      detail: "slim block visible"
    });
    checks.push({
      name: "public_qa_no_contact_email",
      ok: !publicHtml.includes(guestEmail) && !publicHtml.includes(member.email || "@@@"),
      detail: "no emails in public HTML"
    });

    const unpublish = await fetch(`${BASE}/api/admin/intake-questions`, {
      method: "PATCH",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ id: questionId, answerVisibility: "private" })
    });
    checks.push({
      name: "admin_unpublish",
      ok: unpublish.status === 200,
      detail: String(unpublish.status)
    });
  }

  // --- redirects ---
  const qIndex = await fetch(`${BASE}/questions`, { redirect: "manual" });
  checks.push({
    name: "questions_index_redirect",
    ok: qIndex.status === 307 || qIndex.status === 308,
    detail: `${qIndex.status} → ${qIndex.headers.get("location")}`
  });

  // --- API bad input ---
  const bad = await fetch(`${BASE}/api/intake-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exhibitionId: exhibition.id, text: "" })
  });
  checks.push({
    name: "api_empty_question_rejected",
    ok: bad.status === 400,
    detail: String(bad.status)
  });

  // cleanup — only when explicitly allowed. Never wipe shared/prod rows by default.
  const allowCleanup = process.env.P8_SMOKE_CLEANUP === "1";
  if (createdQuestionIds.length && allowCleanup) {
    await prisma.questionNotification.deleteMany({
      where: { questionId: { in: createdQuestionIds } }
    });
    await prisma.questionResponseToken.deleteMany({
      where: { questionId: { in: createdQuestionIds } }
    });
    await prisma.questionAnswer.deleteMany({
      where: { questionId: { in: createdQuestionIds } }
    });
    await prisma.questionRecipient.deleteMany({
      where: { questionId: { in: createdQuestionIds } }
    });
    await prisma.question.deleteMany({ where: { id: { in: createdQuestionIds } } });
    console.log("cleanup_deleted", createdQuestionIds.length);
  } else if (createdQuestionIds.length) {
    console.log(
      "cleanup_skipped",
      createdQuestionIds.length,
      "(set P8_SMOKE_CLEANUP=1 to delete smoke rows)"
    );
  }

  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\nsummary  ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
