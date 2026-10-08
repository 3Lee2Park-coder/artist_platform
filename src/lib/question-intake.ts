import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const QUESTION_TEXT_MAX = 500;
export const ANSWER_TEXT_MAX = 2000;

/** 답변 링크 토큰 유효 기간. 원문은 저장하지 않는다. */
export const QUESTION_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const QUESTION_STATUSES = [
  "submitted",
  "sent",
  "answered",
  "closed",
  "rejected"
] as const;

export const QUESTION_AUDIENCES = ["private", "public_candidate"] as const;

export const ANSWER_VISIBILITIES = ["private", "public", "withdrawn"] as const;

export const RECIPIENT_TYPES = ["artist", "gallery", "organizer", "ooof"] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export type QuestionAudience = (typeof QUESTION_AUDIENCES)[number];
export type AnswerVisibility = (typeof ANSWER_VISIBILITIES)[number];
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

const NEXT_STATUS: Record<QuestionStatus, readonly QuestionStatus[]> = {
  submitted: ["sent", "rejected", "closed"],
  sent: ["answered", "rejected", "closed"],
  answered: ["closed"],
  closed: [],
  rejected: []
};

const questionInputSchema = z.object({
  userId: z.string().min(1).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  exhibitionId: z.string().min(1).nullable().optional(),
  artistId: z.string().min(1).nullable().optional(),
  workId: z.string().min(1).nullable().optional(),
  venueId: z.string().min(1).nullable().optional(),
  text: z.string(),
  audience: z.enum(QUESTION_AUDIENCES).optional()
});

const recipientInputSchema = z.object({
  recipientType: z.enum(RECIPIENT_TYPES),
  recipientId: z.string().min(1).nullable().optional(),
  contactChannel: z.string().min(1).max(200),
  opsNote: z.string().max(400).nullable().optional()
});

export type QuestionInput = z.infer<typeof questionInputSchema>;

export type QuestionRecord = {
  id: string;
  userId: string | null;
  contactEmail: string | null;
  exhibitionId: string | null;
  artistId: string | null;
  workId: string | null;
  venueId: string | null;
  text: string;
  status: QuestionStatus;
  audience: QuestionAudience;
  createdAt: Date;
  updatedAt: Date;
  answers?: QuestionAnswerRecord[];
  recipients?: QuestionRecipientRecord[];
  tokens?: { tokenHash: string }[];
};

export type QuestionAnswerRecord = {
  id: string;
  questionId: string;
  responderId: string | null;
  text: string;
  visibility: AnswerVisibility;
  createdAt: Date;
  updatedAt: Date;
};

export type QuestionRecipientRecord = {
  id: string;
  questionId: string;
  recipientType: RecipientType;
  recipientId: string | null;
  contactChannel: string;
  opsNote: string | null;
};

export type PublicQuestion = {
  id: string;
  exhibitionId: string | null;
  artistId: string | null;
  workId: string | null;
  venueId: string | null;
  text: string;
  status: QuestionStatus;
  audience: QuestionAudience;
  createdAt: string;
  updatedAt: string;
  answers: Array<{
    id: string;
    text: string;
    visibility: "public";
    createdAt: string;
  }>;
};

export type PreparedQuestion = {
  userId: string | null;
  contactEmail: string | null;
  exhibitionId: string | null;
  artistId: string | null;
  workId: string | null;
  venueId: string | null;
  text: string;
  status: "submitted";
  audience: QuestionAudience;
};

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeQuestionText(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export function questionContextError(input: {
  exhibitionId?: string | null;
  artistId?: string | null;
  workId?: string | null;
  venueId?: string | null;
}) {
  if (input.exhibitionId || input.artistId || input.workId || input.venueId) {
    return null;
  }
  return "질문은 전시, 작가, 작품, 장소 중 하나와 연결되어야 합니다.";
}

export function canTransitionQuestionStatus(from: QuestionStatus, to: QuestionStatus) {
  return NEXT_STATUS[from].includes(to);
}

export function hashQuestionToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createQuestionResponseToken(now = new Date()) {
  const rawToken = randomBytes(32).toString("base64url");
  return {
    rawToken,
    tokenHash: hashQuestionToken(rawToken),
    expiresAt: new Date(now.getTime() + QUESTION_TOKEN_TTL_MS)
  };
}

export type TokenAccessReason = "ok" | "invalid" | "expired" | "used" | "wrong_status";

export type TokenAccessResult =
  | { ok: true; reason: "ok" }
  | { ok: false; reason: Exclude<TokenAccessReason, "ok"> };

/** 해시·만료·사용 여부만으로 접근 가능 여부를 판정한다. 원문은 받지 않는다. */
export function resolveTokenAccess(input: {
  tokenHash: string | null | undefined;
  expiresAt: Date | string | null | undefined;
  usedAt: Date | string | null | undefined;
  questionStatus?: QuestionStatus | string | null;
  now?: Date;
}): TokenAccessResult {
  if (!input.tokenHash) return { ok: false, reason: "invalid" };
  if (!input.expiresAt) return { ok: false, reason: "invalid" };

  const now = input.now ?? new Date();
  const expiresAt =
    input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return { ok: false, reason: "invalid" };
  if (expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  if (input.usedAt) return { ok: false, reason: "used" };

  if (input.questionStatus && input.questionStatus !== "sent") {
    return { ok: false, reason: "wrong_status" };
  }

  return { ok: true, reason: "ok" };
}

export function tokenAccessMessage(reason: Exclude<TokenAccessReason, "ok">) {
  if (reason === "expired") return "답변 링크가 만료되었습니다.";
  if (reason === "used") return "이미 답변을 제출한 링크입니다.";
  if (reason === "wrong_status") return "지금은 이 링크로 답변할 수 없습니다.";
  return "유효하지 않은 답변 링크입니다.";
}

export function prepareAnswer(raw: string): { text: string } | { error: string } {
  const text = normalizeQuestionText(raw);
  if (!text) return { error: "답변을 입력해 주세요." };
  if (text.length > ANSWER_TEXT_MAX) {
    return { error: `답변은 ${ANSWER_TEXT_MAX}자까지 적을 수 있습니다.` };
  }
  const blocked = answerBlockedReason(text);
  if (blocked) return { error: blocked };
  return { text };
}

function answerBlockedReason(text: string) {
  if (/(https?:\/\/|www\.)/i.test(text)) {
    return "답변에 링크를 넣을 수 없습니다.";
  }
  if (/카카오|계좌|비밀번호|광고|홍보|입금/.test(text)) {
    return "민감하거나 광고성 표현은 답변에 넣을 수 없습니다.";
  }
  return null;
}

/** 작가 응답 화면에 보여줄 최소 정보. 질문자 이메일·이름은 넣지 않는다. */
export function toArtistResponseView(input: {
  exhibitionTitle?: string | null;
  exhibitionArtist?: string | null;
  workTitle?: string | null;
  questionText: string;
  expiresAt: Date | string;
  askerLabel?: string | null;
}) {
  const expiresAt =
    input.expiresAt instanceof Date
      ? input.expiresAt.toISOString()
      : String(input.expiresAt);
  return {
    exhibitionTitle: input.exhibitionTitle?.trim() || "전시 정보 없음",
    artistName: input.exhibitionArtist?.trim() || "작가 정보 없음",
    workTitle: input.workTitle?.trim() || null,
    questionText: input.questionText,
    askerLabel: "관람객",
    expiresAt
  };
}

/** 운영자가 답변 링크를 다시 열 수 있는 상태 */
export function canIssueResponseToken(status: QuestionStatus | string) {
  return status === "sent" || status === "answered" || status === "submitted";
}

export function responseUrlForToken(rawToken: string, origin?: string) {
  const path = `/q/${encodeURIComponent(rawToken)}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function askerStatusMessage(status: QuestionStatus | string) {
  if (status === "submitted") return "질문을 보냈어요.";
  if (status === "sent") return "질문을 전달했어요. 답변을 기다리고 있어요.";
  if (status === "answered") return "답변이 왔어요. 작가의 이야기를 확인해 보세요.";
  if (status === "rejected") return "질문이 전달되지 않았어요.";
  if (status === "closed") return "질문이 닫혔어요.";
  return "질문 상태를 확인 중이에요.";
}

export type AskerQuestionView = {
  id: string;
  status: QuestionStatus | string;
  statusMessage: string;
  text: string;
  answer: string | null;
  exhibitionId: string | null;
  exhibitionTitle: string | null;
  exhibitionArtist: string | null;
  workTitle: string | null;
  createdAt: string;
  answeredAt: string | null;
  detailHref: string;
};

export function toAskerQuestionView(input: {
  id: string;
  status: string;
  text: string;
  exhibitionId?: string | null;
  exhibitionTitle?: string | null;
  exhibitionArtist?: string | null;
  workTitle?: string | null;
  createdAt: Date | string;
  answer?: { text: string; visibility: string; createdAt: Date | string } | null;
}) {
  const answer =
    input.answer && input.answer.visibility !== "withdrawn"
      ? {
          text: input.answer.text,
          // P5: private도 본인에게는 보여 준다. public 자동 공개는 하지 않는다.
          createdAt:
            input.answer.createdAt instanceof Date
              ? input.answer.createdAt.toISOString()
              : String(input.answer.createdAt)
        }
      : null;

  return {
    id: input.id,
    status: input.status,
    statusMessage: askerStatusMessage(input.status),
    text: input.text,
    answer: answer?.text ?? null,
    exhibitionId: input.exhibitionId ?? null,
    exhibitionTitle: input.exhibitionTitle ?? null,
    exhibitionArtist: input.exhibitionArtist ?? null,
    workTitle: input.workTitle ?? null,
    createdAt:
      input.createdAt instanceof Date
        ? input.createdAt.toISOString()
        : String(input.createdAt),
    answeredAt: answer?.createdAt ?? null,
    detailHref: `/my/questions/${input.id}`
  } satisfies AskerQuestionView;
}

export function prepareQuestion(input: QuestionInput): PreparedQuestion | { error: string } {
  const parsed = questionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }

  const text = normalizeQuestionText(parsed.data.text);
  if (!text) {
    return { error: "질문을 입력해 주세요." };
  }
  if (text.length > QUESTION_TEXT_MAX) {
    return { error: "질문은 500자까지 적을 수 있습니다." };
  }

  const context = {
    exhibitionId: emptyToNull(parsed.data.exhibitionId),
    artistId: emptyToNull(parsed.data.artistId),
    workId: emptyToNull(parsed.data.workId),
    venueId: emptyToNull(parsed.data.venueId)
  };
  const contextError = questionContextError(context);
  if (contextError) return { error: contextError };

  const contactEmail = emptyToNull(parsed.data.contactEmail)?.toLowerCase() ?? null;

  return {
    userId: emptyToNull(parsed.data.userId),
    contactEmail,
    ...context,
    text,
    status: "submitted",
    audience: parsed.data.audience ?? "private"
  };
}

export function prepareExhibitionAsk(input: {
  text: string;
  exhibitionId?: string | null;
  userId?: string | null;
  contactEmail?: string | null;
  artistId?: string | null;
  recipientType: "artist" | "gallery" | "ooof";
  notifyOnAnswer?: boolean;
}) {
  const userId = input.userId?.trim() || null;
  const contactEmail = input.contactEmail?.trim() || null;
  const notify = input.notifyOnAnswer === true;
  if (!userId && notify && !contactEmail) {
    return { error: "알림을 받으려면 이메일을 입력해 주세요." };
  }
  if (!input.exhibitionId?.trim()) {
    return { error: "연결된 전시를 찾을 수 없습니다." };
  }

  const prepared = prepareQuestion({
    text: input.text,
    exhibitionId: input.exhibitionId,
    userId,
    contactEmail,
    artistId: input.recipientType === "artist" ? input.artistId : null
  });
  if ("error" in prepared) return prepared;

  const recipient = prepareRecipient({
    recipientType: input.recipientType,
    recipientId: input.recipientType === "artist" ? input.artistId : null,
    contactChannel: "ops"
  });
  if ("error" in recipient) {
    return { error: recipient.error };
  }

  return { question: prepared, recipient };
}

export function prepareRecipient(input: z.infer<typeof recipientInputSchema>) {
  const parsed = recipientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "수신자 정보가 올바르지 않습니다." };
  }
  return {
    recipientType: parsed.data.recipientType,
    recipientId: emptyToNull(parsed.data.recipientId),
    contactChannel: parsed.data.contactChannel.trim(),
    opsNote: emptyToNull(parsed.data.opsNote)
  };
}

export function intakeFailureMessage(status: number, serverMessage?: string) {
  if (serverMessage && status >= 400 && status < 500) return serverMessage;
  return "질문을 보내지 못했습니다. 다시 시도해 주세요.";
}

export function assertAdminRole(role: string | null | undefined) {
  if (role !== "ADMIN") return "관리자 권한이 필요합니다.";
  return null;
}

/** P3 운영자 전이. answered는 응답 화면(P4)에서만. */
export function canOperatorSetStatus(from: QuestionStatus, to: QuestionStatus) {
  if (to === "answered") return false;
  return canTransitionQuestionStatus(from, to);
}

export function intakeContentWarnings(text: string) {
  const warnings: string[] = [];
  if (/(https?:\/\/|www\.)/i.test(text)) {
    warnings.push("링크가 포함되어 있습니다.");
  }
  if (/\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(text)) {
    warnings.push("전화번호로 보이는 숫자가 있습니다.");
  }
  if (/카카오|계좌|비밀번호|광고|홍보/.test(text)) {
    warnings.push("민감하거나 광고성 표현이 있습니다.");
  }
  return warnings;
}

export function toAdminIntakeQuestion(question: QuestionRecord & {
  notifyOnAnswer?: boolean;
  exhibitionTitle?: string | null;
  exhibitionArtist?: string | null;
  exhibitionVenue?: string | null;
}) {
  return {
    id: question.id,
    text: question.text,
    status: question.status,
    audience: question.audience,
    createdAt: question.createdAt.toISOString(),
    contactEmail: question.contactEmail,
    exhibitionId: question.exhibitionId,
    exhibitionTitle: question.exhibitionTitle ?? null,
    exhibitionArtist: question.exhibitionArtist ?? null,
    exhibitionVenue: question.exhibitionVenue ?? null,
    warnings: intakeContentWarnings(question.text),
    recipient: question.recipients?.[0]
      ? {
          id: question.recipients[0].id,
          recipientType: question.recipients[0].recipientType,
          opsNote: question.recipients[0].opsNote,
          hasExternalContact: false
        }
      : null
  };
}

export function toPublicQuestion(question: QuestionRecord): PublicQuestion {
  const answers = (question.answers ?? [])
    .filter((answer) => answer.visibility === "public")
    .map((answer) => ({
      id: answer.id,
      text: answer.text,
      visibility: "public" as const,
      createdAt: answer.createdAt.toISOString()
    }));

  return {
    id: question.id,
    exhibitionId: question.exhibitionId,
    artistId: question.artistId,
    workId: question.workId,
    venueId: question.venueId,
    text: question.text,
    status: question.status,
    audience: question.audience,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
    answers
  };
}

type QuestionWriter = {
  create(data: PreparedQuestion & { id?: string }): Promise<QuestionRecord>;
};

export async function createIntakeQuestion(writer: QuestionWriter, input: QuestionInput) {
  const prepared = prepareQuestion(input);
  if ("error" in prepared) return prepared;
  const question = await writer.create(prepared);
  return { question, publicQuestion: toPublicQuestion(question) };
}
