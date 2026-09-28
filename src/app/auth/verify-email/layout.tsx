import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이메일 인증"
};

export default function VerifyEmailLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
