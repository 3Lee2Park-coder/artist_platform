import { headers } from "next/headers";

const CRAWLER_UA =
  /googlebot|google-inspectiontool|storebot-google|googleother|bingbot|msnbot|adidxbot|naverbot|yeti|baiduspider|yandex(?:bot|images)|duckduckbot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|bytespider|facebookexternalhit|facebot|twitterbot|slackbot|linkedinbot|kakaotalk-scrap|discordbot|whatsapp|telegrambot|preview|crawler|spider|bot\b|uptime|pingdom|statuscake|vercel-favicon|vercel-screenshot/i;

export async function shouldSkipAnalytics() {
  try {
    const requestHeaders = await headers();
    const userAgent = requestHeaders.get("user-agent") ?? "";
    const purpose = `${requestHeaders.get("purpose") ?? ""} ${
      requestHeaders.get("sec-purpose") ?? ""
    }`.toLowerCase();

    if (CRAWLER_UA.test(userAgent)) {
      return true;
    }

    if (
      requestHeaders.get("next-router-prefetch") === "1" ||
      requestHeaders.get("x-middleware-prefetch") === "1" ||
      purpose.includes("prefetch")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
