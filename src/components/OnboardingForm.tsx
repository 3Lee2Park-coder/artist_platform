"use client";

import { INTEREST_CATEGORIES, VISIT_PURPOSES } from "@/lib/taste";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OnboardingFormProps = {
  initialInterests?: string[];
  initialPurposes?: string[];
};

export function OnboardingForm({
  initialInterests = [],
  initialPurposes = []
}: OnboardingFormProps) {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [purposes, setPurposes] = useState<string[]>(initialPurposes);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit() {
    if (interests.length === 0 || purposes.length === 0) {
      setError("관심 분야와 방문 목적을 각각 1개 이상 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interestTags: interests, visitPurposes: purposes })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "저장에 실패했습니다.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <p className="eyebrow">Onboarding</p>
        <h1>어떤 전시를 좋아하세요?</h1>
        <p className="auth-description">
          선택한 취향을 바탕으로 홈에서 맞춤 전시를 먼저 추천해드립니다. 나중에 마이페이지에서
          언제든 바꿀 수 있어요.
        </p>

        <div className="onboarding-group">
          <h2>관심 분야</h2>
          <p className="field-hint">보고 싶은 전시 장르를 골라주세요. (복수 선택)</p>
          <div className="chip-select">
            {INTEREST_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={interests.includes(item) ? "taste-chip active" : "taste-chip"}
                onClick={() => toggle(interests, setInterests, item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="onboarding-group">
          <h2>방문 목적</h2>
          <p className="field-hint">주로 어떤 이유로 전시를 찾으시나요? (복수 선택)</p>
          <div className="chip-select">
            {VISIT_PURPOSES.map((item) => (
              <button
                key={item}
                type="button"
                className={purposes.includes(item) ? "taste-chip active" : "taste-chip"}
                onClick={() => toggle(purposes, setPurposes, item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="onboarding-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push("/")}
          >
            건너뛰기
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "저장 중..." : "취향 저장하고 시작하기"}
          </button>
        </div>
      </section>
    </main>
  );
}
