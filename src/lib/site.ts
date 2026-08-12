import { BRAND } from "@/lib/brand";

/** Canonical production host — keep apex/www consistent with Vercel primary domain */
export const SITE_HOST = "ooof.co.kr";

export function getSiteUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    // Prefer https; strip trailing slash
    const normalized = fromEnv.replace(/\/$/, "");
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `https://${normalized}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
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
