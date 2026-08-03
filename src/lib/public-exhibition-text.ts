/** 공공 API 텍스트/HTML 정규화 */

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

export function stripHtml(value: string) {
  const decoded = decodeHtmlEntities(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");

  return decoded
    .replace(/\b(p|span|div|br|style|line-height|font-size)\b/gi, " ")
    .replace(/[{};:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeImageUrl(url: string) {
  return /\.(jpe?g|png|webp|gif|bmp|svg)(\?.*)?$/i.test(url);
}

/** HEAD 검증 없이 URL만 신뢰 (문화포털 CDN 등 대량 sync용) */
export function trustPublicHeroImageUrl(rawUrl?: string): string | undefined {
  const url = rawUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  if (!looksLikeImageUrl(url)) return undefined;
  return url;
}

export async function normalizePublicHeroImageUrl(
  rawUrl?: string,
  options?: { skipHeadCheck?: boolean }
): Promise<string | undefined> {
  if (options?.skipHeadCheck) {
    return trustPublicHeroImageUrl(rawUrl);
  }

  const url = rawUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return undefined;
  }

  if (!looksLikeImageUrl(url)) {
    return undefined;
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(6000),
      redirect: "follow"
    });

    if (!response.ok) {
      return looksLikeImageUrl(url) ? url : undefined;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const contentDisposition =
      response.headers.get("content-disposition")?.toLowerCase() ?? "";

    if (contentDisposition.includes("attachment") && !contentType.startsWith("image/")) {
      return undefined;
    }

    if (contentType.startsWith("image/")) {
      return url;
    }

    if (
      contentType.includes("octet-stream") ||
      contentType.includes("binary") ||
      !contentType
    ) {
      return looksLikeImageUrl(url) ? url : undefined;
    }

    return undefined;
  } catch {
    return looksLikeImageUrl(url) ? url : undefined;
  }
}
