"use client";

import {
  settleDocumentTitle,
  trackPageView
} from "@/lib/client-analytics";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Client navigations only. The first load page_view comes from gtag config
 * so GA4 can record user_engagement (참여 세션).
 */
export function AnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);
  const skippedInitial = useRef(false);

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (!skippedInitial.current) {
      skippedInitial.current = true;
      lastKey.current = key;
      return;
    }
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
