import { headers } from "next/headers";

export type TrafficChannel =
  | "naver_search"
  | "google_search"
  | "direct"
  | "internal"
  | "social"
  | "other";

/** Referer·UA로 유입 채널을 추정. 네이버 인앱은 리퍼러가 비는 경우가 있어 other로 남을 수 있다. */
export async function detectTrafficChannel(
  siteHost?: string
): Promise<TrafficChannel> {
  try {
    const requestHeaders = await headers();
    const referer = requestHeaders.get("referer") ?? "";
    const host = siteHost ?? requestHeaders.get("host") ?? "";

    if (!referer) return "direct";

    let refHost = "";
    try {
      refHost = new URL(referer).hostname.toLowerCase();
    } catch {
      return "other";
    }

    if (host && (refHost === host || refHost.endsWith(`.${host}`))) {
      return "internal";
    }
    if (
      refHost.includes("search.naver.") ||
      refHost.includes("m.search.naver.") ||
      refHost.includes("naver.com")
    ) {
      return "naver_search";
    }
    if (
      refHost.includes("google.") ||
      refHost.includes("googleusercontent.")
    ) {
      return "google_search";
    }
    if (
      refHost.includes("instagram.") ||
      refHost.includes("facebook.") ||
      refHost.includes("t.co") ||
      refHost.includes("twitter.") ||
      refHost.includes("x.com") ||
      refHost.includes("kakao.")
    ) {
      return "social";
    }
    return "other";
  } catch {
    return "other";
  }
}
