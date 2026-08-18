import Script from "next/script";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-C7TPEQPJVQ";
const GOOGLE_ADS_TAG_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_TAG_ID ?? "G-856LRPYS7Y";

export function GoogleAnalytics() {
  const tagIds = Array.from(
    new Set([GA_MEASUREMENT_ID, GOOGLE_ADS_TAG_ID].filter(Boolean))
  );

  if (tagIds.length === 0) {
    return null;
  }

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${tagIds[0]}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${tagIds.map((id) => `gtag('config', '${id}');`).join("\n          ")}
        `}
      </Script>
    </>
  );
}
