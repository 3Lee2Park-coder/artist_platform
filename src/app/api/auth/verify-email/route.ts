import { verifyEmailToken } from "@/lib/email-verification";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 400 });
  }

  const user = await verifyEmailToken(token);

  if (!user) {
    return NextResponse.json(
      { error: "만료되었거나 유효하지 않은 인증 링크입니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    email: user.email,
    verifiedAt: user.emailVerifiedAt
  });
}
