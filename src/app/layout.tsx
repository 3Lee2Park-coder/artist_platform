import type { Metadata } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exhibit | 전시 방문 전환형 플랫폼",
  description:
    "개인 작가의 전시 발견, 작품 탐색, 예약 전환을 돕는 MVP 메인 홈페이지"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}