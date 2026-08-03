"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * 클라이언트 전환 시 상단 진행 바로 “이동 중”임을 보여 줍니다.
 * App Router의 loading.tsx와 함께 쓰면 체감 대기시간이 줄어듭니다.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const hideTimer = useRef<number | null>(null);

  function start() {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setActive(true);
  }

  function stopSoon() {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
    }
    hideTimer.current = window.setTimeout(() => {
      setActive(false);
      hideTimer.current = null;
    }, 350);
  }

  useEffect(() => {
    stopSoon();
    // pathname/search 변경 = 전환 완료에 가깝게 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      start();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
      }
    };
  }, []);

  return (
    <div
      className={active ? "nav-progress active" : "nav-progress"}
      role="progressbar"
      aria-hidden={!active}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="페이지 이동 중"
    >
      <div className="nav-progress-bar" />
    </div>
  );
}
