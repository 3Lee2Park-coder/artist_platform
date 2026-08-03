"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VisitToggleButtonProps = {
  target:
    | { kind: "space"; spaceId: string }
    | { kind: "program"; programId: string }
    | { kind: "exhibition"; exhibitionId: string };
  isLoggedIn: boolean;
  initialVisited: boolean;
  redirectPath: string;
};

// "다녀왔어요" 방문 기록 토글 — 사용자가 직접 남기는 자기 기록
export function VisitToggleButton({
  target,
  isLoggedIn,
  initialVisited,
  redirectPath
}: VisitToggleButtonProps) {
  const router = useRouter();
  const [visited, setVisited] = useState(initialVisited);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    setPending(true);
    const body =
      target.kind === "space"
        ? { spaceId: target.spaceId }
        : target.kind === "program"
          ? { programId: target.programId }
          : { exhibitionId: target.exhibitionId };

    const response = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setPending(false);

    if (response.ok) {
      const data = await response.json();
      setVisited(Boolean(data.visited));
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className={visited ? "visit-toggle-button active" : "visit-toggle-button"}
      onClick={toggle}
      disabled={pending}
    >
      {visited ? "✓ 다녀왔어요" : "다녀왔어요"}
    </button>
  );
}
