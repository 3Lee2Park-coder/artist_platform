import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertAdminRole,
  canIssueResponseToken,
  canOperatorSetStatus,
  canTransitionQuestionStatus,
  createIntakeQuestion,
  createQuestionResponseToken,
  hashQuestionToken,
  intakeContentWarnings,
  intakeFailureMessage,
  prepareAnswer,
  prepareExhibitionAsk,
  prepareQuestion,
  prepareRecipient,
  resolveTokenAccess,
  responseUrlForToken,
  toAdminIntakeQuestion,
  toArtistResponseView,
  toAskerQuestionView,
  askerStatusMessage,
  toPublicQuestion,
  tokenAccessMessage,
  type QuestionRecord
} from "./question-intake";

const now = new Date("2026-10-02T00:00:00.000Z");

function record(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    id: "q1",
    userId: "user-1",
    contactEmail: "guest@example.com",
    exhibitionId: "exhibition-1",
    artistId: null,
    workId: null,
    venueId: null,
    text: "입장 마감이 언제인가요",
    status: "submitted",
    audience: "private",
    createdAt: now,
    updatedAt: now,
    answers: [],
    recipients: [
      {
        id: "r1",
        questionId: "q1",
        recipientType: "artist",
        recipientId: "artist-1",
        contactChannel: "artist@example.com",
        opsNote: "검수 전"
      }
    ],
    tokens: [{ tokenHash: "abc" }],
    ...overrides
  };
}

test("rejects an empty question and text over 500 characters", () => {
  const empty = prepareQuestion({ text: "   ", exhibitionId: "exhibition-1" });
  assert.equal("error" in empty, true);

  const long = prepareQuestion({
    text: "가".repeat(501),
    exhibitionId: "exhibition-1"
  });
  assert.equal("error" in long, true);
  if (!("error" in long)) return;
  assert.match(long.error, /500/);
});

test("exhibition ask requires a session or an email and an exhibition", () => {
  const quietGuest = prepareExhibitionAsk({
    text: "이 파란색은 어떤 의미인가요",
    exhibitionId: "exhibition-1",
    recipientType: "ooof"
  });
  assert.equal("error" in quietGuest, false);

  const notifyWithoutEmail = prepareExhibitionAsk({
    text: "이 파란색은 어떤 의미인가요",
    exhibitionId: "exhibition-1",
    recipientType: "ooof",
    notifyOnAnswer: true
  });
  assert.equal("error" in notifyWithoutEmail, true);

  const missingShow = prepareExhibitionAsk({
    text: "이 파란색은 어떤 의미인가요",
    exhibitionId: "  ",
    userId: "user-1",
    recipientType: "artist"
  });
  assert.equal("error" in missingShow, true);

  assert.equal(intakeFailureMessage(500, "db down"), "질문을 보내지 못했습니다. 다시 시도해 주세요.");
  assert.equal(intakeFailureMessage(400, "질문을 입력해 주세요."), "질문을 입력해 주세요.");
});

test("question requires one context and keeps email off the body", () => {
  const missing = prepareQuestion({ text: "언제 열리나요" });
  assert.equal("error" in missing, true);

  const prepared = prepareQuestion({
    text: "  언제   열리나요 ",
    contactEmail: "Guest@Example.com",
    userId: "user-1",
    exhibitionId: "exhibition-1"
  });
  assert.equal("error" in prepared, false);
  if ("error" in prepared) return;
  assert.equal(prepared.text, "언제 열리나요");
  assert.equal(prepared.contactEmail, "guest@example.com");
  assert.equal(prepared.text.includes(prepared.contactEmail ?? ""), false);
  assert.equal(prepared.status, "submitted");
});

test("status moves forward without delete", () => {
  assert.equal(canTransitionQuestionStatus("submitted", "sent"), true);
  assert.equal(canTransitionQuestionStatus("submitted", "answered"), false);
  assert.equal(canTransitionQuestionStatus("rejected", "sent"), false);
});

test("response token is stored as a hash", () => {
  const token = createQuestionResponseToken(now);
  assert.notEqual(token.tokenHash, token.rawToken);
  assert.equal(token.tokenHash, hashQuestionToken(token.rawToken));
  assert.equal(token.expiresAt.getTime() - now.getTime(), 14 * 24 * 60 * 60 * 1000);
});

test("public question hides contact, ops notes, and tokens", () => {
  const pub = toPublicQuestion(
    record({
      answers: [
        {
          id: "a1",
          questionId: "q1",
          responderId: "artist-1",
          text: "일요일 6시입니다",
          visibility: "public",
          createdAt: now,
          updatedAt: now
        },
        {
          id: "a2",
          questionId: "q1",
          responderId: "artist-1",
          text: "내부 메모",
          visibility: "private",
          createdAt: now,
          updatedAt: now
        }
      ]
    })
  );
  const json = JSON.stringify(pub);
  assert.equal(json.includes("guest@example.com"), false);
  assert.equal(json.includes("artist@example.com"), false);
  assert.equal(json.includes("검수 전"), false);
  assert.equal(json.includes("abc"), false);
  assert.equal(json.includes("user-1"), false);
  assert.equal(pub.answers.length, 1);
  assert.equal(pub.answers[0]?.text, "일요일 6시입니다");
  assert.equal(pub.exhibitionId, "exhibition-1");
  assert.ok("artistId" in pub);
  assert.ok("workId" in pub);
});

test("createIntakeQuestion persists through the writer and returns a public view", async () => {
  const result = await createIntakeQuestion(
    {
      async create(data) {
        return record({
          text: data.text,
          contactEmail: data.contactEmail,
          venueId: data.venueId,
          exhibitionId: data.exhibitionId
        });
      }
    },
    {
      text: "주차 되나요",
      contactEmail: "guest@example.com",
      venueId: "place-1"
    }
  );
  assert.equal("error" in result, false);
  if ("error" in result) return;
  assert.equal(result.question.contactEmail, "guest@example.com");
  assert.equal(JSON.stringify(result.publicQuestion).includes("guest@example.com"), false);
});

test("recipient contact stays on the recipient row", () => {
  const recipient = prepareRecipient({
    recipientType: "gallery",
    contactChannel: "desk@gallery.test",
    opsNote: "주최 확인"
  });
  assert.equal("error" in recipient, false);
  if ("error" in recipient) return;
  assert.equal(recipient.contactChannel, "desk@gallery.test");
  assert.equal(recipient.opsNote, "주최 확인");
});

test("ask control stays below save and deck actions", () => {
  const page = readFileSync("src/app/exhibitions/[id]/page.tsx", "utf8");
  const saveAt = page.indexOf("<CollectActions");
  const askAt = page.indexOf("<ExhibitionAsk");
  assert.ok(saveAt > 0);
  assert.ok(askAt > saveAt);
  assert.equal(page.includes("<ReservationWidget"), false);
  assert.equal(page.includes("받을 곳"), false);
});

test("operator inbox rules hide contacts from the public shape", () => {
  assert.equal(assertAdminRole(null), "관리자 권한이 필요합니다.");
  assert.equal(assertAdminRole("MEMBER"), "관리자 권한이 필요합니다.");
  assert.equal(assertAdminRole("ADMIN"), null);
  assert.equal(canOperatorSetStatus("submitted", "sent"), true);
  assert.equal(canOperatorSetStatus("submitted", "rejected"), true);
  assert.equal(canOperatorSetStatus("submitted", "answered"), false);
  assert.equal(canOperatorSetStatus("sent", "answered"), false);

  const adminView = toAdminIntakeQuestion(record());
  assert.equal(adminView.contactEmail, "guest@example.com");
  assert.equal(JSON.stringify(adminView).includes("artist@example.com"), false);
  assert.equal(adminView.recipient?.hasExternalContact, false);
  assert.ok(intakeContentWarnings("계좌로 입금해 주세요 https://spam.test").length >= 2);
});

test("response token access rejects expired used and wrong status", () => {
  const token = createQuestionResponseToken(now);
  assert.equal(
    resolveTokenAccess({
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: null,
      questionStatus: "sent",
      now
    }).ok,
    true
  );
  assert.equal(
    resolveTokenAccess({
      tokenHash: token.tokenHash,
      expiresAt: new Date(now.getTime() - 1000),
      usedAt: null,
      questionStatus: "sent",
      now
    }).reason,
    "expired"
  );
  assert.equal(
    resolveTokenAccess({
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: now,
      questionStatus: "sent",
      now
    }).reason,
    "used"
  );
  assert.equal(
    resolveTokenAccess({
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: null,
      questionStatus: "answered",
      now
    }).reason,
    "wrong_status"
  );
  assert.equal(
    resolveTokenAccess({
      tokenHash: null,
      expiresAt: token.expiresAt,
      usedAt: null,
      now
    }).reason,
    "invalid"
  );

  assert.equal("error" in prepareAnswer("   "), true);
  assert.equal("error" in prepareAnswer("가".repeat(2001)), true);
  assert.equal("error" in prepareAnswer("계좌로 입금해 주세요"), true);
  assert.equal("error" in prepareAnswer("https://spam.test"), true);
  const okAnswer = prepareAnswer("  일요일 6시까지입니다  ");
  assert.equal("error" in okAnswer, false);
  if (!("error" in okAnswer)) assert.equal(okAnswer.text, "일요일 6시까지입니다");

  const view = toArtistResponseView({
    exhibitionTitle: "노들섬",
    exhibitionArtist: "김작가",
    workTitle: "파란 조각",
    questionText: "이 파란색은 어떤 의미인가요",
    expiresAt: token.expiresAt,
    askerLabel: "숨겨질 이름"
  });
  const json = JSON.stringify(view);
  assert.equal(view.askerLabel, "관람객");
  assert.equal(json.includes("guest@"), false);
  assert.equal(json.includes("숨겨질 이름"), false);
  assert.equal(view.workTitle, "파란 조각");

  assert.equal(canIssueResponseToken("sent"), true);
  assert.equal(canIssueResponseToken("answered"), true);
  assert.equal(canIssueResponseToken("closed"), false);
  assert.equal(
    responseUrlForToken(token.rawToken, "https://www.ooof.co.kr").includes(token.rawToken),
    true
  );
  assert.equal(tokenAccessMessage("expired").includes("만료"), true);
});

test("admin and response routes never echo raw token helpers into public shape", () => {
  const token = createQuestionResponseToken(now);
  const pub = toPublicQuestion(record({ tokens: [{ tokenHash: token.tokenHash }] }));
  const json = JSON.stringify(pub);
  assert.equal(json.includes(token.rawToken), false);
  assert.equal(json.includes(token.tokenHash), false);
});

test("asker status copy and private answer stay on the owner view", () => {
  assert.equal(askerStatusMessage("submitted"), "질문을 보냈어요.");
  assert.equal(
    askerStatusMessage("sent"),
    "질문을 전달했어요. 답변을 기다리고 있어요."
  );
  assert.equal(
    askerStatusMessage("answered"),
    "답변이 왔어요. 작가의 이야기를 확인해 보세요."
  );

  const view = toAskerQuestionView({
    id: "q1",
    status: "answered",
    text: "이 파란색은 어떤 의미인가요",
    exhibitionId: "ex1",
    exhibitionTitle: "노들섬",
    exhibitionArtist: "김작가",
    workTitle: "파란 조각",
    createdAt: now,
    answer: {
      text: "하늘과 물을 떠올렸어요",
      visibility: "private",
      createdAt: now
    }
  });
  assert.equal(view.answer, "하늘과 물을 떠올렸어요");
  assert.equal(view.detailHref, "/my/questions/q1");
  assert.match(view.statusMessage, /답변이 왔어요/);
});
