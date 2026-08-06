import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

/** Latin brand / numerals — paired with Pretendard for Hangul UI */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-latin",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Sokkup | 동네에서 작가와 직접 만나다",
  description:
    "작가의 공간에서 작품과 사람을 직접 만나는 동네 전시를 찾는 곳. 코스·지도·방문 안내·예약까지."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={poppins.variable} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
