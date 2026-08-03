"use client";

import { ExhibitionCard } from "@/components/ExhibitionCard";
import { HomeSectionHeader } from "@/components/HomeSectionHeader";
import type { Exhibition } from "@/types/exhibition";
import { useEffect, useMemo, useState } from "react";

/** 고객이 하루 몇 번 와도 과하지 않게: 4시간마다 세트 교체 */
const ROTATION_HOURS = 4;
const DISPLAY_COUNT = 12;

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const random = mulberry32(hashSeed(seed));
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getRotationSeed() {
  const bucket = Math.floor(Date.now() / (ROTATION_HOURS * 60 * 60 * 1000));
  return `all-exhibitions-${bucket}`;
}

type AllExhibitionsSectionClientProps = {
  exhibitions: Exhibition[];
};

export function AllExhibitionsSectionClient({
  exhibitions
}: AllExhibitionsSectionClientProps) {
  const [seed, setSeed] = useState("all-exhibitions-ssr");

  useEffect(() => {
    setSeed(getRotationSeed());
  }, []);

  const visible = useMemo(() => {
    if (exhibitions.length === 0) return [];
    return shuffleWithSeed(exhibitions, seed).slice(0, DISPLAY_COUNT);
  }, [exhibitions, seed]);

  if (visible.length === 0) return null;

  return (
    <section className="home-section">
      <HomeSectionHeader
        eyebrow="전시 모아보기"
        title="더 많은 전시를 둘러보세요"
        description="시간이 지날수록 다른 전시 조합이 보여요. 마음에 드는 전시를 저장해 두세요."
        actionLabel="전시 전체"
        actionHref="/exhibitions"
      />

      <div className="exhibition-grid">
        {visible.map((exhibition) => (
          <ExhibitionCard key={exhibition.id} exhibition={exhibition} compact />
        ))}
      </div>
    </section>
  );
}
