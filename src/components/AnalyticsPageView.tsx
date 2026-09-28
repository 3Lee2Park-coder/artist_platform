"use client";

import {
  settleDocumentTitle,
  trackPageView
} from "@/lib/client-analytics";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fires GA4 page_view after document.title settles on App Router navigations.
 * Pairs with gtag config { send_page_view: false } to avoid empty/(not set) titles.
 */
export function AnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (lastKey.current === key) return;

    let cancelled = false;
    const previousTitle = document.title;
    lastKey.current = key;

    void (async () => {
      const page_title = await settleDocumentTitle({ previousTitle });
      if (cancelled) return;
      trackPageView({
        page_title,
        page_location: window.location.href,
        page_path: pathname
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}
