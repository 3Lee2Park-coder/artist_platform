"use client";

import type { Dosirak } from "@/lib/dosirak";
import { useEffect, useRef } from "react";

type DosirakTrackerProps = {
  dosirak: Dosirak;
  /** 어느 화면의 식판인지 — home_today / dosirak_index / hero */
  surface: string;
  children: React.ReactNode;
};

function send(
  type: "DOSIRAK_IMPRESSION" | "DOSIRAK_OPEN",
  dosirak: Dosirak,
  surface: string
) {
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      source: surface,
      metadata: {
        curationId: dosirak.id,
        dosirakNumber: dosirak.number,
        title: dosirak.title,
        compartmentCount: dosirak.compartmentCount,
        updatedDaysAgo: dosirak.updatedDaysAgo,
        endingSoon: dosirak.endingSoon
      }
    })
  }).catch(() => undefined);
}

/**
 * 식판 하나의 노출·열람을 남긴다.
 * 노출은 화면에 들어올 때 한 번만, 열람은 식판 안에서 일어난 클릭 전부를 잡는다.
 * 실패해도 화면에는 영향이 없다.
 */
export function DosirakTracker({
  dosirak,
  surface,
  children
}: DosirakTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || impressionSent.current) continue;
          impressionSent.current = true;
          send("DOSIRAK_IMPRESSION", dosirak, surface);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [dosirak, surface]);

  return (
    <div
      ref={ref}
      className="dosirak-tracked"
      onClickCapture={() => send("DOSIRAK_OPEN", dosirak, surface)}
    >
      {children}
    </div>
  );
}
