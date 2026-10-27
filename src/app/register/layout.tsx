import type { Metadata } from "next";
import "./register.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function RegisterLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
