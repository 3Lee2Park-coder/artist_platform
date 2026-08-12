import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/NavigationProgress";
import { BRAND } from "@/lib/brand";
import { absoluteUrl, getSiteUrl, siteConfig } from "@/lib/site";
import "./globals.css";

/** Latin brand / numerals — paired with Pretendard for Hangul UI */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-latin",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${BRAND.mark} | ${BRAND.campaignLine.replace(` ${BRAND.mark}`, "")}`,
    template: `%s | ${BRAND.mark}`
  },
  description: BRAND.descriptor,
  applicationName: BRAND.mark,
  keywords: [
    "OOOF",
    "Olly Olly Oxen Free",
    "동네 전시",
    "전시 지도",
    "작가 공간",
    "큐레이션",
    "전시 코스"
  ],
  authors: [{ name: BRAND.mark }],
  creator: BRAND.mark,
  publisher: BRAND.mark,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: absoluteUrl("/"),
    siteName: BRAND.mark,
    title: `${BRAND.mark} | 못 찾겠다, 꾀꼬리?`,
    description: BRAND.descriptor
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.mark} | 못 찾겠다, 꾀꼬리?`,
    description: BRAND.descriptor
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  formatDetection: {
    telephone: false
  }
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
