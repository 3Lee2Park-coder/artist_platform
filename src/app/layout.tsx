import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { JsonLd } from "@/components/JsonLd";
import { NavigationProgress } from "@/components/NavigationProgress";
import { BRAND, brandTitle } from "@/lib/brand";
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
    default: brandTitle(),
    template: `%s | ${BRAND.mark}`
  },
  description: BRAND.seoDescription,
  applicationName: BRAND.mark,
  keywords: [...BRAND.seoKeywords],
  authors: [{ name: BRAND.mark }],
  creator: BRAND.mark,
  publisher: BRAND.mark,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: absoluteUrl("/"),
    siteName: `${BRAND.mark}(${BRAND.koreanAlias})`,
    title: brandTitle(),
    description: BRAND.seoDescription
  },
  twitter: {
    card: "summary_large_image",
    title: brandTitle(),
    description: BRAND.seoDescription
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
        <GoogleAnalytics />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: `${BRAND.mark}(${BRAND.koreanAlias})`,
                alternateName: [BRAND.mark, BRAND.koreanAlias, BRAND.fullName],
                url: getSiteUrl(),
                description: BRAND.seoDescription,
                inLanguage: "ko-KR"
              },
              {
                "@type": "Organization",
                name: `${BRAND.mark}(${BRAND.koreanAlias})`,
                legalName: BRAND.fullName,
                url: getSiteUrl(),
                description: BRAND.seoDescription
              }
            ]
          }}
        />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
