import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function getFromAddress() {
  return process.env.EMAIL_FROM?.trim() || "Exhibit <onboarding@resend.dev>";
}

function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim();
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }

  return "http://localhost:3000";
}

export function getAppUrl(path = "") {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipped:", subject, "→", to);
    return { ok: false as const, skipped: true as const };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
    text
  });

  if (result.error) {
    console.error("[email] send failed:", result.error);
    return { ok: false as const, error: result.error.message };
  }

  return { ok: true as const, id: result.data?.id };
}

export function buildVerificationEmail(name: string, verifyUrl: string) {
  return {
    subject: "[Exhibit] 이메일 인증을 완료해 주세요",
    html: `
      <div style="font-family:sans-serif;line-height:1.6;color:#111;">
        <p>${name}님, Exhibit 가입을 환영합니다.</p>
        <p>아래 버튼을 눌러 이메일 인증을 완료해 주세요. 링크는 24시간 동안 유효합니다.</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">이메일 인증하기</a></p>
        <p style="font-size:13px;color:#666;">버튼이 동작하지 않으면 아래 주소를 복사해 브라우저에 붙여넣으세요.<br/>${verifyUrl}</p>
      </div>
    `,
    text: `${name}님, Exhibit 이메일 인증 링크: ${verifyUrl}`
  };
}

export function buildReservationConfirmEmail(input: {
  name: string;
  exhibitionTitle: string;
  venue: string;
  visitDate: string;
  slot: string;
  detailUrl: string;
  kindLabel?: string;
}) {
  const kindLabel = input.kindLabel ?? "전시";
  return {
    subject: `[Exhibit] ${input.exhibitionTitle} 예약이 확정되었습니다`,
    html: `
      <div style="font-family:sans-serif;line-height:1.6;color:#111;">
        <p>${input.name}님, 예약이 확정되었습니다.</p>
        <ul>
          <li><strong>${kindLabel}</strong> ${input.exhibitionTitle}</li>
          <li><strong>장소</strong> ${input.venue}</li>
          <li><strong>일시</strong> ${input.visitDate} ${input.slot}</li>
        </ul>
        <p><a href="${input.detailUrl}">상세 보기</a></p>
      </div>
    `,
    text: `${input.name}님, ${input.exhibitionTitle} / ${input.visitDate} ${input.slot} 예약 확정. ${input.detailUrl}`
  };
}

export function buildArtistReservationNoticeEmail(input: {
  artistName: string;
  guestName: string;
  guestEmail: string;
  title: string;
  venue: string;
  visitDate: string;
  slot: string;
  manageUrl: string;
  kindLabel: string;
}) {
  return {
    subject: `[Exhibit] ${input.title}에 새 예약이 있습니다`,
    html: `
      <div style="font-family:sans-serif;line-height:1.6;color:#111;">
        <p>${input.artistName}님, ${input.kindLabel}에 새 예약이 들어왔습니다.</p>
        <ul>
          <li><strong>${input.kindLabel}</strong> ${input.title}</li>
          <li><strong>장소</strong> ${input.venue}</li>
          <li><strong>일시</strong> ${input.visitDate} ${input.slot}</li>
          <li><strong>예약자</strong> ${input.guestName} (${input.guestEmail})</li>
        </ul>
        <p><a href="${input.manageUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">예약 현황 보기</a></p>
      </div>
    `,
    text: `${input.artistName}님, ${input.title} / ${input.visitDate} ${input.slot} 새 예약 — ${input.guestName}. ${input.manageUrl}`
  };
}

export function buildEndingSoonEmail(input: {
  name: string;
  exhibitionTitle: string;
  endDate: string;
  daysLeft: number;
  detailUrl: string;
}) {
  return {
    subject: `[Exhibit] 저장하신 전시가 D-${input.daysLeft}입니다`,
    html: `
      <div style="font-family:sans-serif;line-height:1.6;color:#111;">
        <p>${input.name}님, 저장해 두신 전시 <strong>${input.exhibitionTitle}</strong>의 종료일이 ${input.endDate}입니다.</p>
        <p>마감까지 <strong>D-${input.daysLeft}</strong> — 방문 계획이 있다면 일정을 확인해 주세요.</p>
        <p><a href="${input.detailUrl}">전시 상세 보기</a></p>
        <p style="font-size:12px;color:#888;">알림 수신을 원치 않으시면 MY 페이지에서 설정을 변경할 수 있습니다.</p>
      </div>
    `,
    text: `${input.exhibitionTitle} D-${input.daysLeft} (${input.endDate}). ${input.detailUrl}`
  };
}
