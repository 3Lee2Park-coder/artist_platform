"use client";

import { RichIntroEditor } from "@/components/RichIntroEditor";
import { TalkScheduleEditor } from "@/components/TalkScheduleEditor";
import { slugify } from "@/lib/date";
import type { ReservationDay } from "@/lib/reservation-slots";
import { parseReservationSchedule } from "@/lib/reservation-slots";
import {
  createTextBlock,
  parseStoryBlocks,
  serializeStoryBlocks,
  storyBlocksToImageUrls,
  storyBlocksToPlainText,
  type StoryBlock
} from "@/lib/story";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type OwnedSpace = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

const PROGRAM_TYPES = [
  { value: "OPEN_STUDIO", label: "오픈 스튜디오" },
  { value: "ARTIST_TALK", label: "작가와의 대화" },
  { value: "WORKSHOP", label: "워크숍" },
  { value: "TOUR", label: "투어" }
] as const;

export type ProgramFormInitial = {
  id: string;
  slug: string;
  title: string;
  type: string;
  spaceId: string;
  summary: string | null;
  description: string | null;
  storyJson?: string | null;
  imageUrls?: string | null;
  heroImageUrl: string | null;
  startDate: string;
  endDate: string;
  reservationSlots: string;
  reservationRequired: boolean;
  policyNote: string | null;
};

type ProgramRegisterFormProps = {
  spaces: OwnedSpace[];
  mode?: "create" | "edit";
  initial?: ProgramFormInitial;
  isAdmin?: boolean;
};

async function uploadFile(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "파일 업로드에 실패했습니다.");
  return data.url as string;
}

export function ProgramRegisterForm({
  spaces,
  mode = "create",
  initial,
  isAdmin = false
}: ProgramRegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slugPreview, setSlugPreview] = useState(initial?.slug ?? "");
  const [type, setType] = useState<(typeof PROGRAM_TYPES)[number]["value"]>(
    (initial?.type as (typeof PROGRAM_TYPES)[number]["value"]) ?? "OPEN_STUDIO"
  );
  const [spaceId, setSpaceId] = useState(initial?.spaceId ?? spaces[0]?.id ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [reservationRequired, setReservationRequired] = useState(
    initial?.reservationRequired ?? true
  );
  const [policyNote, setPolicyNote] = useState(initial?.policyNote ?? "");
  const [schedule, setSchedule] = useState<ReservationDay[]>(() => {
    if (initial?.reservationSlots) {
      const parsed = parseReservationSchedule(initial.reservationSlots);
      if (parsed.length > 0) return parsed;
    }
    return [{ date: "", slots: [{ time: "14:00", capacity: 8 }] }];
  });
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(initial?.heroImageUrl ?? "");
  const [storyBlocks, setStoryBlocks] = useState<StoryBlock[]>(() => {
    const fromJson = parseStoryBlocks(initial?.storyJson);
    if (fromJson.length > 0) return fromJson;
    if (initial?.description?.trim()) {
      return [createTextBlock(initial.description)];
    }
    return [createTextBlock()];
  });

  useEffect(() => {
    if (mode === "edit") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlugPreview(
      slugify(title).replace(/^exhibition-/, "program-") || "프로그램-제목-입력"
    );
  }, [title, mode]);

  if (spaces.length === 0) {
    return (
      <section className="register-card wide">
        <p className="eyebrow">Program register</p>
        <h1>프로그램 등록</h1>
        <p className="auth-description">
          프로그램을 등록하려면 먼저 본인 소유의 공간을 등록해야 합니다.
        </p>
        <a className="primary-button" href="/register/space">
          공간 먼저 등록하기
        </a>
      </section>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      let nextHero = heroImageUrl || null;
      if (heroImageFile) {
        nextHero = await uploadFile(heroImageFile, "programs");
      }

      const cleanedSchedule = schedule
        .filter((day) => day.date && day.slots.length > 0)
        .map((day) => ({
          date: day.date as string,
          slots: day.slots.filter((slot) => slot.time)
        }));

      const storyJson = serializeStoryBlocks(storyBlocks);
      const description = storyBlocksToPlainText(storyBlocks) || null;
      const imageUrls = storyBlocksToImageUrls(storyBlocks);

      const payload = {
        slug:
          mode === "edit"
            ? initial!.slug
            : slugPreview.startsWith("program-")
              ? slugPreview
              : `program-${slugPreview}`,
        title,
        type,
        spaceId,
        summary: summary || null,
        description,
        storyJson,
        imageUrls,
        heroImageUrl: nextHero,
        startDate,
        endDate,
        schedule: cleanedSchedule,
        reservationRequired,
        policyNote: policyNote || null
      };

      const response = await fetch(
        mode === "edit" ? `/api/my/programs/${initial!.id}` : "/api/my/programs",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "프로그램 저장에 실패했습니다.");
      }

      router.push(
        mode === "edit"
          ? "/my?tab=artist&updated=program"
          : isAdmin
            ? `/programs/${data.program.slug}?registered=program`
            : "/my?registered=program"
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "프로그램 저장 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="register-card wide story-form" onSubmit={handleSubmit}>
      <p className="eyebrow">
        {mode === "edit" ? "Edit program" : "Program register"}
      </p>
      <h1>{mode === "edit" ? "프로그램 수정" : "작가 프로그램 등록"}</h1>
      <p className="auth-description">
        {mode === "edit"
          ? "소개·일정·예약 정책을 수정할 수 있습니다."
          : isAdmin
            ? "관리자 계정으로 등록하면 검수 없이 바로 공개됩니다."
            : "오픈 스튜디오·작가와의 대화·워크숍을 등록합니다. 소개는 텍스트와 이미지로 자유롭게 구성하세요."}
      </p>

      <div className="story-form-grid">
        <section className="story-form-main">
          <label>
            프로그램 제목
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 오픈 스튜디오 — 신당 공방"
              required
            />
          </label>
          {mode === "create" ? (
            <p className="field-hint">주소용 slug: {slugPreview}</p>
          ) : null}

          <label>
            한 줄 소개
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="작가와 함께 공방을 둘러보는 30분"
            />
          </label>

          <RichIntroEditor
            label="프로그램 소개"
            hint="진행 방식, 준비물, 분위기 등을 사진과 함께 자유롭게 적어 주세요."
            blocks={storyBlocks}
            onChange={setStoryBlocks}
            uploadFolder="programs/story"
            onError={setError}
          />
        </section>

        <aside className="story-form-side">
          <label>
            유형
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as (typeof PROGRAM_TYPES)[number]["value"])
              }
            >
              {PROGRAM_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            진행 공간
            <select
              value={spaceId}
              onChange={(event) => setSpaceId(event.target.value)}
              required
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                  {space.status !== "PUBLISHED" ? ` (${space.status})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            시작일
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label>
            종료일
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={reservationRequired}
              onChange={(event) => setReservationRequired(event.target.checked)}
            />
            예약 필요
          </label>

          {reservationRequired ? (
            <>
              <p className="field-label">예약 일정</p>
              <TalkScheduleEditor
                value={schedule}
                onChange={setSchedule}
                enabled={reservationRequired}
                startDate={startDate}
                endDate={endDate}
              />
            </>
          ) : null}

          <label>
            취소 / 방문 정책
            <input
              value={policyNote}
              onChange={(event) => setPolicyNote(event.target.value)}
              placeholder="시작 24시간 전까지 취소할 수 있습니다."
            />
          </label>

          <label>
            대표 이미지
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setHeroImageFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {heroImageUrl && !heroImageFile ? (
            <div className="story-form-hero-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="대표 이미지 미리보기" />
            </div>
          ) : null}
        </aside>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="review-form-actions">
        <button type="submit" className="primary-button" disabled={loading}>
          {loading
            ? "저장 중..."
            : mode === "edit"
              ? "수정 저장"
              : isAdmin
                ? "등록하고 공개하기"
                : "검수 요청하기"}
        </button>
      </div>
    </form>
  );
}
