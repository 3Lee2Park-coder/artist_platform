import Script from "next/script";

/**
 * Canonical GA4: G-C7TPEQPJVQ (NEXT_PUBLIC_GA_MEASUREMENT_ID).
 * Google Ads: AW-… only when NEXT_PUBLIC_GOOGLE_ADS_ID is set.
 * Do not default a second G- ID — that produced GA4-Config noise.
 *
 * Initial page_view stays ON. Turning it off (send_page_view: false) stopped
 * user_engagement, so GA4 marked almost every 1-page session as not engaged.
 * Client navigations are handled by AnalyticsPageView.
 */
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-C7TPEQPJVQ";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";

export function GoogleAnalytics() {
  const configIds: string[] = [];
  if (GA_MEASUREMENT_ID) configIds.push(GA_MEASUREMENT_ID);
  if (GOOGLE_ADS_ID.startsWith("AW-")) configIds.push(GOOGLE_ADS_ID);

  if (configIds.length === 0) {
    return null;
  }

  return (
    <>
      <Script id="google-analytics" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = function gtag(){dataLayer.push(arguments);};
          gtag('js', new Date());
          ${configIds.map((id) => `gtag('config', '${id}');`).join("\n          ")}
        `}
      </Script>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${configIds[0]}`}
        strategy="afterInteractive"
      />
    </>
  );
}
