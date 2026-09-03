"use client";

import { DosirakObject } from "@/components/DosirakObject";
import type { Dosirak } from "@/lib/dosirak";

type DosirakTrayProps = {
  dosirak: Dosirak;
  variant?: "preview" | "open";
  linked?: boolean;
};

/** 예전 식판 API — 물리 도시락 오브젝트로 연결한다. */
export function DosirakTray({
  dosirak,
  variant = "preview"
}: DosirakTrayProps) {
  return (
    <DosirakObject
      dosirak={dosirak}
      defaultOpen={variant === "open"}
      size={variant === "open" ? "detail" : "home"}
      peekable
    />
  );
}
