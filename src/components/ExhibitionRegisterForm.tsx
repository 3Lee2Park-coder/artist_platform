"use client";

import { AddressSearchField } from "@/components/AddressSearchField";
import { TalkScheduleEditor } from "@/components/TalkScheduleEditor";
import { slugify } from "@/lib/date";
import { getDefaultDistrict } from "@/lib/locations";
import {
  fillEmptyTalkDates,
  requireTalkReservation,
  type ReservationDay
} from "@/lib/reservation-slots";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useState } from "react";

type ArtworkInput = {
  title: string;
  material: string;
  price: string;
  imageUrl: string;
  imageFile: File | null;
};

const defaultArtwork: ArtworkInput = {
  title: "",
  material: "",
  price: "",
  imageUrl: "",
  imageFile: null
};

async function uploadFile(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "파일 업로드에 실패했습니다.");
  }

  return data.url as string;
}

export function ExhibitionRegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [slugPreview, setSlugPreview] = useState("");
  const [artist, setArtist] = useState("");
  const [region, setRegion] = useState("서울");
  const [district, setDistrict] = useState(getDefaultDistrict("서울"));
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("37.5447");
  const [lng, setLng] = useState("127.0557");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categories, setCategories] = useState<string[]>(["회화"]);
  const [exhibitionType, setExhibitionType] = useState("개인 대관형 전시");
  const [curationAvailable, setCurationAvailable] = useState(true);
  const [reservable, setReservable] = useState(true);
  const [todayOpen, setTodayOpen] = useState(true);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [talkSchedule, setTalkSchedule] = useState<ReservationDay[]>([
    { date: "", slots: [{ time: "14:00", capacity: 10 }] }
  ]);
  const [artistVideoTitle, setArtistVideoTitle] = useState("");
  const [artistVideoFile, setArtistVideoFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [descriptionImageFiles, setDescriptionImageFiles] = useState<File[]>([]);
  const [artworks, setArtworks] = useState<ArtworkInput[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlugPreview(slugify(title) || "전시-제목-입력-시-자동-생성");
  }, [title]);

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  }

  function updateArtwork(
    index: number,
    field: keyof ArtworkInput,
    value: string | File | null
  ) {
    setArtworks((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement | null;
    if (target?.tagName === "TEXTAREA") return;
    if (step < 3) {
      event.preventDefault();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3) {
      return;
    }
    setLoading(true);
    setError("");

    try {
      let heroImageUrl: string | undefined;
      let artistVideoUrl: string | undefined;

      if (heroImageFile) {
        heroImageUrl = await uploadFile(heroImageFile, "exhibitions/hero");
      }

      if (artistVideoFile) {
        artistVideoUrl = await uploadFile(artistVideoFile, "exhibitions/video");
      }

      const descriptionImages: string[] = [];
      for (const file of descriptionImageFiles) {
        descriptionImages.push(await uploadFile(file, "exhibitions/description"));
      }

      const artworkPayload = [];

      for (const artwork of artworks) {
        if (!artwork.title.trim()) continue;

        let imageUrl = artwork.imageUrl || undefined;

        if (artwork.imageFile) {
          imageUrl = await uploadFile(artwork.imageFile, "artworks");
        }

        artworkPayload.push({
          title: artwork.title.trim(),
          material: artwork.material.trim() || "미정",
          price: artwork.price ? Number(artwork.price) : undefined,
          imageUrl
        });
      }

      const talk = requireTalkReservation({
        reservable,
        schedule: fillEmptyTalkDates(talkSchedule, startDate)
      });
      if (!talk.ok) {
        setError(talk.error);
        setTalkSchedule((prev) => fillEmptyTalkDates(prev, startDate));
        setStep(2);
        setLoading(false);
        return;
      }

      const payload = {
        title,
        artist,
        region,
        district,
        venue,
        address,
        lat: Number(lat),
        lng: Number(lng),
        startDate,
        endDate,
        categories,
        exhibitionType,
        curationAvailable,
        reservable: talk.reservable,
        todayOpen,
        summary,
        description,
        descriptionImages,
        reservationSchedule: talk.schedule,
        heroImageUrl,
        artistVideoTitle: artistVideoTitle || undefined,
        artistVideoDuration: artistVideoUrl || artistVideoTitle ? "01:00" : undefined,
        artistVideoUrl,
        artworks: artworkPayload
      };

      const response = await fetch("/api/exhibitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "전시 등록에 실패했습니다.");
        setLoading(false);
        return;
      }

      // 등록 직후 노출 상태를 작가가 바로 확인할 수 있도록 상세 + MY 안내
      router.push(
        `/exhibitions/${data.exhibition.id}?registered=1`
      );
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "전시 등록에 실패했습니다."
      );
      setLoading(false);
    }
  }

  return (
    <form
      className="register-form"
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
    >
      <div className="stepper">
        {[1, 2, 3].map((item) => (
          <button
            key={item}
            type="button"
            className={step === item ? "stepper-item active" : "stepper-item"}
            onClick={() => {
              setTalkSchedule((prev) => fillEmptyTalkDates(prev, startDate));
              setStep(item);
            }}
          >
            Step {item}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="form-grid">
          <label className="full-width">
            전시 제목
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <p className="field-hint full-width">
            URL 주소는 제목에서 자동 생성됩니다:{" "}
            <code>/exhibitions/{slugPreview}</code>
          </p>
          <label>
            작가명
            <input value={artist} onChange={(e) => setArtist(e.target.value)} required />
          </label>
          <label>
            전시 유형
            <select value={exhibitionType} onChange={(e) => setExhibitionType(e.target.value)}>
              <option>개인 대관형 전시</option>
              <option>갤러리 초대전/기획전 전시</option>
              <option>페어형 전시</option>
            </select>
          </label>
          <label>
            시작일
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const next = e.target.value;
                setStartDate(next);
                setTalkSchedule((prev) => fillEmptyTalkDates(prev, next));
              }}
              required
            />
          </label>
          <label>
            종료일
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </label>
          <label className="full-width">
            대표 이미지 (선택)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <fieldset className="checkbox-group full-width">
            <legend>카테고리</legend>
            {["회화", "사진", "조각", "복합"].map((category) => (
              <label key={category} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                {category}
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="form-grid">
          <AddressSearchField
            region={region}
            district={district}
            venue={venue}
            address={address}
            lat={lat}
            lng={lng}
            onRegionChange={setRegion}
            onDistrictChange={setDistrict}
            onVenueChange={setVenue}
            onAddressChange={setAddress}
            onLatChange={setLat}
            onLngChange={setLng}
            onError={setError}
          />
          <label className="full-width">
            한 줄 소개
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="예: 성수에서 열리는 개인전"
            />
          </label>
          <label className="full-width">
            전시 소개
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="전시 이야기를 자유롭게 적어 주세요."
            />
          </label>
          <label className="full-width">
            소개글 이미지 (선택, 여러 장 가능)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) =>
                setDescriptionImageFiles(e.target.files ? Array.from(e.target.files) : [])
              }
            />
            <span className="field-hint">
              전시 소개 본문 아래에 순서대로 노출됩니다.
            </span>
          </label>
          <div className="full-width">
            <p className="field-label">작가와 대화 일정 · 정원</p>
            <TalkScheduleEditor
              value={talkSchedule}
              onChange={(next) => {
                setTalkSchedule(next);
                if (next.length === 0) {
                  setReservable(false);
                }
              }}
              enabled={reservable}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
          <label className="full-width">
            작가 영상 제목 (선택)
            <input value={artistVideoTitle} onChange={(e) => setArtistVideoTitle(e.target.value)} />
          </label>
          <label className="full-width">
            작가 영상 파일 (선택, mp4/webm)
            <input
              type="file"
              accept="video/mp4,video/webm"
              onChange={(e) => setArtistVideoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="checkbox-row full-width">
            <label className="checkbox-label">
              <input type="checkbox" checked={curationAvailable} onChange={(e) => setCurationAvailable(e.target.checked)} />
              큐레이션 제공
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={reservable}
                onChange={(e) => {
                  const next = e.target.checked;
                  setReservable(next);
                  if (!next) {
                    setTalkSchedule([]);
                  } else if (talkSchedule.length === 0) {
                    setTalkSchedule(
                      fillEmptyTalkDates(
                        [{ date: "", slots: [{ time: "14:00", capacity: 10 }] }],
                        startDate
                      )
                    );
                  }
                }}
              />
              작가와 대화 예약 가능
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={todayOpen} onChange={(e) => setTodayOpen(e.target.checked)} />
              오늘 오픈 (홈 노출 강화)
            </label>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="artwork-form-list">
          <p className="auth-description" style={{ marginTop: 0 }}>
            작품 등록은 선택 사항입니다. 나중에 MY에서 전시를 수정해 추가할 수도
            있습니다.
          </p>
          {artworks.length === 0 ? (
            <div className="empty-state">등록된 작품이 없습니다. 필요하면 아래에서 추가하세요.</div>
          ) : null}
          {artworks.map((artwork, index) => (
            <div key={index} className="artwork-form-card">
              <div className="artwork-form-card-head">
                <h3>작품 {index + 1}</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setArtworks((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  삭제
                </button>
              </div>
              <label>
                작품명
                <input
                  value={artwork.title}
                  onChange={(e) => updateArtwork(index, "title", e.target.value)}
                />
              </label>
              <label>
                재료/매체
                <input
                  value={artwork.material}
                  onChange={(e) => updateArtwork(index, "material", e.target.value)}
                />
              </label>
              <label>
                가격 (선택)
                <input
                  type="number"
                  value={artwork.price}
                  onChange={(e) => updateArtwork(index, "price", e.target.value)}
                />
              </label>
              <label>
                작품 이미지
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    updateArtwork(index, "imageFile", e.target.files?.[0] ?? null)
                  }
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={() => setArtworks((prev) => [...prev, { ...defaultArtwork }])}
          >
            작품 추가 (선택)
          </button>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        {step > 1 ? (
          <button
            key="prev-step"
            type="button"
            className="secondary-button"
            onClick={() => setStep((prev) => prev - 1)}
          >
            이전
          </button>
        ) : null}
        {step < 3 ? (
          <button
            key="next-step"
            type="button"
            className="primary-button"
            onClick={(event) => {
              // type="button"→"submit" DOM 재사용으로 클릭이 제출로 이어지는 것 방지
              event.preventDefault();
              event.stopPropagation();
              if (step === 1) {
                setTalkSchedule((prev) => fillEmptyTalkDates(prev, startDate));
              }
              if (step === 2 && reservable) {
                const talk = requireTalkReservation({
                  reservable: true,
                  schedule: fillEmptyTalkDates(talkSchedule, startDate)
                });
                if (!talk.ok) {
                  setError(talk.error);
                  setTalkSchedule((prev) => fillEmptyTalkDates(prev, startDate));
                  return;
                }
              }
              setError("");
              setStep((prev) => prev + 1);
            }}
          >
            다음
          </button>
        ) : (
          <button
            key="submit-exhibition"
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "등록 중..." : "전시 공개"}
          </button>
        )}
      </div>
    </form>
  );
}
