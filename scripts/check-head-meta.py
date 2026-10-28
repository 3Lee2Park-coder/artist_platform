#!/usr/bin/env python3
"""Check whether title, canonical, and Open Graph tags sit in <head>."""

import re
import sys
import urllib.request

PATHS = [
    "/",
    "/exhibitions",
    "/exhibitions/public-202508210001995",
    "/decks/cmuxh00ed0001fh4j3qlf6oww",
]

UAS = [
    (
        "Chrome",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    ),
    (
        "Googlebot",
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    ),
    ("Yeti", "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)"),
    ("facebookexternalhit", "facebookexternalhit/1.1"),
]

# Apex redirects to www, and the app declares www as the canonical host.
CANONICAL_ORIGIN = "https://www.ooof.co.kr"
BLOCKING_UAS = {"Googlebot", "Yeti", "facebookexternalhit"}
# Production baseline: these routes already render metadata in <head> for every UA.
CHROME_IN_HEAD = {"/", "/exhibitions"}


def fetch(url: str, ua: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8", "replace")


def attr(html: str, name: str) -> str:
    pattern = (
        rf"<meta[^>]*(?:property|name)=[\"']{re.escape(name)}[\"'][^>]*content=[\"']([^\"']*)[\"']"
        rf"|<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*(?:property|name)=[\"']{re.escape(name)}[\"']"
    )
    match = re.search(pattern, html, re.I)
    if not match:
        return ""
    return match.group(1) or match.group(2) or ""


def title_text(html: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""


def canonical(html: str) -> str:
    match = re.search(
        r"<link[^>]*rel=[\"']canonical[\"'][^>]*href=[\"']([^\"']+)[\"']"
        r"|<link[^>]*href=[\"']([^\"']+)[\"'][^>]*rel=[\"']canonical[\"']",
        html,
        re.I,
    )
    if not match:
        return ""
    return match.group(1) or match.group(2) or ""


def gtag_ids(html: str) -> list[str]:
    return sorted(set(re.findall(r"gtag\([\"']config[\"'],\s*[\"']([^\"']+)[\"']", html)))


def analyze(html: str, path: str) -> dict:
    head_end = html.find("</head>")
    markers = {
        "title": html.lower().find("<title"),
        "canonical": html.lower().find('rel="canonical"'),
        "og:url": html.lower().find('property="og:url"'),
        "og:image": html.lower().find('property="og:image"'),
    }
    if markers["canonical"] < 0:
        markers["canonical"] = html.lower().find("rel='canonical'")
    in_head = head_end >= 0 and all(0 <= pos < head_end for pos in markers.values())
    title = title_text(html)
    canon = canonical(html)
    og_url = attr(html, "og:url")
    og_image = attr(html, "og:image")
    expected = CANONICAL_ORIGIN if path == "/" else f"{CANONICAL_ORIGIN}{path}"
    content_ok = bool(title) and canon == expected and og_url == canon and og_image.startswith(("http://", "https://"))
    return {
        "head_end": head_end,
        "in_head": in_head,
        "title": title,
        "canonical": canon,
        "og:url": og_url,
        "og:image": og_image,
        "content_ok": content_ok,
        "gtm": html.count("googletagmanager"),
        "gtag": html.count("gtag"),
        "gtm_id": html.count("GTM-KB7FSQTQ"),
        "gtag_ids": gtag_ids(html),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check-head-meta.py BASE_URL", file=sys.stderr)
        return 2
    base = sys.argv[1].rstrip("/")
    rows = []
    failed = False
    for path in PATHS:
        by_ua = {}
        for name, ua in UAS:
            html = fetch(base + path, ua)
            by_ua[name] = analyze(html, path)
        values = {
            name: (row["title"], row["canonical"], row["og:url"], row["og:image"])
            for name, row in by_ua.items()
        }
        same = len(set(values.values())) == 1
        for name, row in by_ua.items():
            if name in BLOCKING_UAS:
                location_ok = row["in_head"]
            else:
                location_ok = row["in_head"] == (path in CHROME_IN_HEAD)
            ok = location_ok and row["content_ok"] and same
            failed = failed or not ok
            rows.append(
                (
                    path,
                    name,
                    "PASS" if ok else "FAIL",
                    "head" if row["in_head"] else "body",
                    "yes" if row["content_ok"] else "no",
                    "yes" if same else "no",
                    row["head_end"],
                )
            )
        sample = next(iter(by_ua.values()))
        print(
            f"# {path} gtm={sample['gtm']} gtag={sample['gtag']} "
            f"GTM-KB7FSQTQ={sample['gtm_id']} gtag_ids={','.join(sample['gtag_ids']) or '-'}"
        )
    print("path\tua\tresult\tlocation\tcontent\tua_match\thead_end")
    for row in rows:
        print("\t".join(str(part) for part in row))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
