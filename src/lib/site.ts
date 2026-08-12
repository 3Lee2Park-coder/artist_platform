import { BRAND } from "@/lib/brand";

/**
 * Canonical production host.
 * Apex ooof.co.kr currently 308 → www.ooof.co.kr, so SEO URLs use www.
 */
export const SITE_HOST = "www.ooof.co.kr";

function normalizeSiteUrl(raw: string) {
  const trimmed = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isVercelAppHost(url: string) {
  try {
    return /\.vercel\.app$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function getSiteUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    const normalized = normalizeSiteUrl(fromEnv);
    // Stale Production env pointing at *.vercel.app must not win over the real domain
    if (
      process.env.VERCEL_ENV === "production" &&
      isVercelAppHost(normalized)
    ) {
      return `https://${SITE_HOST}`;
    }
    return normalized;
  }

  if (process.env.VERCEL_ENV === "production") {
    return `https://${SITE_HOST}`;
  }

  if (process.env.VERCEL_URL) {
    return normalizeSiteUrl(process.env.VERCEL_URL);
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  return `https://${SITE_HOST}`;
}

export const siteConfig = {
  name: BRAND.mark,
  fullName: BRAND.fullName,
  description: BRAND.descriptor,
  host: SITE_HOST,
  locale: "ko_KR"
} as const;

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
