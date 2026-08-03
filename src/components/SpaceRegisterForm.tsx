"use client";

import { AddressSearchField } from "@/components/AddressSearchField";
import { RichIntroEditor } from "@/components/RichIntroEditor";
import { slugify } from "@/lib/date";
import { getDefaultDistrict } from "@/lib/locations";
import {
  createTextBlock,
  parseStoryBlocks,
  serializeStoryBlocks,
  storyBlocksToImageUrls,
  storyBlocksToPlainText,
  type StoryBlock
} from "@/lib/story";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const SPACE_TYPES = [
  { value: "SHOWROOM", label: "쇼룸" },
  { value: "STUDIO", label: "작업실" },
  { value: "RESIDENCY", label: "레지던시 공방" },
  { value: "SHARED_SPACE", label: "공유 공간" }
] as const;

const VISIT_POLICIES = [
  { value: "WALK_IN", label: "자유 방문 가능" },
  { value: "HOURS", label: "운영 시간 내 방문 권장" },
  { value: "APPOINTMENT", label: "예약자 우선" },
  { value: "PROGRAM_ONLY", label: "프로그램 시간에만 방문" },
  { value: "CLOSED", label: "현재 미운영" }
] as const;

const WEEKDAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" }
] as const;

export type SpaceFormInitial = {
  id: string;
  slug: string;
  name: string;
  type: string;
  region: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  floorOrUnit: string | null;
  shortDescription: string | null;
  description: string | null;
  storyJson?: string | null;
  imageUrls?: string | null;
  visitPolicy: string;
  visitNotice: string | null;
  openingHours: string;
  heroImageUrl: string | null;
};

type SpaceRegisterFormProps = {
  mode?: "create" | "edit";
  initial?: SpaceFormInitial;
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

function parseHours(raw: string | null | undefined): Record<string, string> {
  try {
    const parsed = JSON.parse(raw ?? "{}") as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function needsOpeningHours(
  type: string,
  visitPolicy: string
): boolean {
  return type === "SHOWROOM" || visitPolicy === "WALK_IN" || visitPolicy === "HOURS";
}

export function SpaceRegisterForm({
  mode = "create",
  initial,
  isAdmin = false
}: SpaceRegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [slugPreview, setSlugPreview] = useState(initial?.slug ?? "");
  const [type, setType] = useState<(typeof SPACE_TYPES)[number]["value"]>(
    (initial?.type as (typeof SPACE_TYPES)[number]["value"]) ?? "SHOWROOM"
  );
  const [region, setRegion] = useState(initial?.region ?? "서울");
  const [district, setDistrict] = useState(
    initial?.district ?? getDefaultDistrict("서울")
  );
  const [address, setAddress] = useState(initial?.address ?? "");
  const [lat, setLat] = useState(String(initial?.lat ?? "37.5614"));
  const [lng, setLng] = useState(String(initial?.lng ?? "127.0134"));
  const [floorOrUnit, setFloorOrUnit] = useState(initial?.floorOrUnit ?? "");
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? ""
  );
  const [visitPolicy, setVisitPolicy] = useState<
    (typeof VISIT_POLICIES)[number]["value"]
  >((initial?.visitPolicy as (typeof VISIT_POLICIES)[number]["value"]) ?? "HOURS");
  const [visitNotice, setVisitNotice] = useState(initial?.visitNotice ?? "");
  const [openingHours, setOpeningHours] = useState<Record<string, string>>(() => {
    const parsed = parseHours(initial?.openingHours);
    if (Object.keys(parsed).length > 0) return parsed;
    return {
      tue: "11:00-18:00",
      wed: "11:00-18:00",
      thu: "11:00-18:00",
      fri: "11:00-18:00",
      sat: "11:00-18:00"
    };
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

  const showHours = useMemo(
    () => needsOpeningHours(type, visitPolicy),
    [type, visitPolicy]
  );

  useEffect(() => {
    if (mode === "edit") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlugPreview(slugify(name).replace(/^exhibition-/, "space-") || "공간-이름-입력");
  }, [name, mode]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      let nextHero = heroImageUrl || null;
      if (heroImageFile) {
        nextHero = await uploadFile(heroImageFile, "spaces");
      }

      const cleanedHours = showHours
        ? Object.fromEntries(
            Object.entries(openingHours).filter(([, value]) => value.trim())
          )
        : {};

      const storyJson = serializeStoryBlocks(storyBlocks);
      const description = storyBlocksToPlainText(storyBlocks) || null;
      const imageUrls = storyBlocksToImageUrls(storyBlocks);

      const payload = {
        slug:
          mode === "edit"
            ? initial!.slug
            : slugPreview.startsWith("space-")
              ? slugPreview
              : `space-${slugPreview}`,
        name,
        type,
        region,
        district,
        address,
        lat: Number(lat),
        lng: Number(lng),
        floorOrUnit: floorOrUnit || null,
        shortDescription: shortDescription || null,
        description,
        storyJson,
        imageUrls,
        heroImageUrl: nextHero,
        visitPolicy,
        visitNotice: visitNotice || null,
        openingHours: cleanedHours
      };

      const response = await fetch(
        mode === "edit" ? `/api/my/spaces/${initial!.id}` : "/api/my/spaces",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "공간 저장에 실패했습니다.");
      }

      router.push(
        mode === "edit"
          ? "/my?tab=artist&updated=space"
          : isAdmin
            ? `/spaces/${data.space.slug}?registered=space`
            : "/my?registered=space"
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "공간 저장 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="register-card wide story-form" onSubmit={handleSubmit}>
      <p className="eyebrow">{mode === "edit" ? "Edit space" : "Space register"}</p>
      <h1>{mode === "edit" ? "공간 수정" : "작가 공간 등록"}</h1>
      <p className="auth-description">
        {mode === "edit"
          ? "소개와 방문 정책을 수정할 수 있습니다. 공개 상태는 관리자 검수를 따릅니다."
          : isAdmin
            ? "관리자 계정으로 등록하면 검수 없이 바로 공개됩니다."
            : "공방·쇼룸·작업실을 등록하면 관리자 검수 후 공개됩니다. 소개는 텍스트와 이미지로 자유롭게 구성하세요."}
      </p>

      <div className="story-form-grid">
        <section className="story-form-main">
          <label>
            공간 이름
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 신당 공방 A"
              required
            />
          </label>
          {mode === "create" ? (
            <p className="field-hint">주소용 slug: {slugPreview}</p>
          ) : null}

          <label>
            한 줄 소개
            <input
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              placeholder="나무의 결을 따라 일상 오브제를 만드는 공방"
            />
          </label>

          <RichIntroEditor
            label="공간 소개"
            hint="문단과 사진을 섞어 블로그처럼 자유롭게 작성할 수 있습니다."
            blocks={storyBlocks}
            onChange={setStoryBlocks}
            uploadFolder="spaces/story"
            onError={setError}
          />
        </section>

        <aside className="story-form-side">
          <label>
            공간 유형
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as (typeof SPACE_TYPES)[number]["value"])
              }
            >
              {SPACE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <AddressSearchField
            region={region}
            district={district}
            venue={floorOrUnit}
            address={address}
            lat={lat}
            lng={lng}
            onRegionChange={setRegion}
            onDistrictChange={setDistrict}
            onVenueChange={setFloorOrUnit}
            onAddressChange={setAddress}
            onLatChange={setLat}
            onLngChange={setLng}
            onError={setError}
          />
          <p className="field-hint">
            주소 검색의 &lsquo;장소명&rsquo;에는 호수·층 정보(예: 지하 1층 12호)를
            적어 주세요.
          </p>

          <label>
            방문 정책
            <select
              value={visitPolicy}
              onChange={(event) =>
                setVisitPolicy(
                  event.target.value as (typeof VISIT_POLICIES)[number]["value"]
                )
              }
            >
              {VISIT_POLICIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            방문 안내
            <input
              value={visitNotice}
              onChange={(event) => setVisitNotice(event.target.value)}
              placeholder="작업 중에는 조용히 둘러봐 주세요."
            />
          </label>

          {showHours ? (
            <>
              <p className="field-label">운영 시간 (비우면 해당 요일 휴무)</p>
              <p className="field-hint">
                쇼룸·자유 방문·운영시간 정책일 때만 입력이 필요합니다.
              </p>
              <div className="admin-place-grid">
                {WEEKDAYS.map((day) => (
                  <label key={day.key}>
                    {day.label}
                    <input
                      value={openingHours[day.key] ?? ""}
                      onChange={(event) =>
                        setOpeningHours((prev) => ({
                          ...prev,
                          [day.key]: event.target.value
                        }))
                      }
                      placeholder="11:00-18:00"
                    />
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="field-hint hours-skip-note">
              예약·프로그램 전용 공간은 운영시간 대신 방문 안내와 프로그램 일정을
              기준으로 안내합니다.
            </p>
          )}

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
