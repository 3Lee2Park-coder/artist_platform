import Script from "next/script";

/**
 * Canonical GA4: G-C7TPEQPJVQ (NEXT_PUBLIC_GA_MEASUREMENT_ID).
 * Google Ads: load AW-… only when NEXT_PUBLIC_GOOGLE_ADS_ID is set (conversions
 * also fire from GoogleAdsConversionTracker). Never default a second G- ID here —
 * dual gtag('config', G-…) looked like GA4-Config noise and double page_views.
 *
 * send_page_view: false — AnalyticsPageView sends page_view after title settles.
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
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${configIds[0]}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${configIds
            .map(
              (id) =>
                `gtag('config', '${id}', { send_page_view: false });`
            )
            .join("\n          ")}
        `}
      </Script>
    </>
  );
}
