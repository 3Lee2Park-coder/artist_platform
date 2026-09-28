import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입"
};

export default function SignupLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
