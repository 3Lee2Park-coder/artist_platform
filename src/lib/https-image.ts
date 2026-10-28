const HTTPS_UPGRADE_HOSTS = new Set([
  "www.culture.go.kr",
  "culture.go.kr",
  "www.nlcy.go.kr",
  "nlcy.go.kr"
]);

/** Upgrade allowlisted public-image hosts from http:// to https://. */
export function upgradeImageUrl(url?: string | null): string | undefined {
  if (url == null) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (!/^http:\/\//i.test(value)) return value;

  try {
    const parsed = new URL(value);
    if (!HTTPS_UPGRADE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return value;
    }
    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return value;
  }
}

/** Rewrite allowlisted http:// image URLs inside HTML attributes and plain text. */
export function upgradeImagesInHtml(html: string): string {
  if (!html || !/http:\/\//i.test(html)) return html;
  return html.replace(/https?:\/\/[^\s"'<>\\]+/gi, (match) => {
    if (!/^http:\/\//i.test(match)) return match;
    return upgradeImageUrl(match) ?? match;
  });
}
