"use client";

import { AddressSearchField } from "@/components/AddressSearchField";
import { TalkScheduleEditor } from "@/components/TalkScheduleEditor";
import { getDefaultDistrict } from "@/lib/locations";
import {
  parseReservationSchedule,
  resolveTalkReservation,
  type ReservationDay
} from "@/lib/reservation-slots";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type ArtworkDraft = {
  id?: string;
  title: string;
  material: string;
  price: string;
  imageUrl: string;
  imageFile: File | null;
  previewUrl: string;
};

type ExhibitionEditFormProps = {
  exhibition: {
    id: string;
    title: string;
    artist: string;
    region: string;
    district: string;
    venue: string;
    address: string;
    lat: number;
    lng: number;
    categories: string;
    exhibitionType: string;
    curationAvailable: boolean;
    summary: string;
    description: string;
    startDate: string;
    endDate: string;
    reservable: boolean;
    todayOpen: boolean;
    heroImageUrl: string | null;
    descriptionImages?: string[];
    artistVideoTitle: string | null;
    artistVideoDuration: string | null;
    artistVideoUrl: string | null;
    reservationSlots: string;
  };
  artworks: Array<{
    id: string;
    title: string;
    material: string;
    price: number | null;
    imageUrl: string | null;
  }>;
};

const CATEGORY_OPTIONS = ["회화", "사진", "조각", "복합"];

const emptyArtwork = (): ArtworkDraft => ({
  title: "",
  material: "",
  price: "",
  imageUrl: "",
  imageFile: null,
  previewUrl: ""
});

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

function parseCategories(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function ExhibitionEditForm({
  exhibition,
  artworks: initialArtworks
}: ExhibitionEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(exhibition.title);
  const [region, setRegion] = useState(exhibition.region || "서울");
  const [district, setDistrict] = useState(
    exhibition.district || getDefaultDistrict(exhibition.region || "서울")
  );
  const [venue, setVenue] = useState(exhibition.venue);
  const [address, setAddress] = useState(exhibition.address);
  const [lat, setLat] = useState(String(exhibition.lat));
  const [lng, setLng] = useState(String(exhibition.lng));
  const [categories, setCategories] = useState<string[]>(
    parseCategories(exhibition.categories)
  );
  const [exhibitionType, setExhibitionType] = useState(exhibition.exhibitionType);
  const [curationAvailable, setCurationAvailable] = useState(
    exhibition.curationAvailable
  );
  const [summary, setSummary] = useState(exhibition.summary);
  const [description, setDescription] = useState(exhibition.description);
  const [startDate, setStartDate] = useState(exhibition.startDate);
  const [endDate, setEndDate] = useState(exhibition.endDate);
  const [reservable, setReservable] = useState(exhibition.reservable);
  const [todayOpen, setTodayOpen] = useState(exhibition.todayOpen);
  const [artistVideoTitle, setArtistVideoTitle] = useState(
    exhibition.artistVideoTitle ?? ""
  );
  const [artistVideoDuration, setArtistVideoDuration] = useState(
    exhibition.artistVideoDuration ?? "01:00"
  );
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState(
    exhibition.heroImageUrl ?? ""
  );
  const [descriptionImages, setDescriptionImages] = useState<string[]>(
    exhibition.descriptionImages ?? []
  );
  const [descriptionImageFiles, setDescriptionImageFiles] = useState<File[]>(
    []
  );
  const [artistVideoFile, setArtistVideoFile] = useState<File | null>(null);
  const [talkSchedule, setTalkSchedule] = useState<ReservationDay[]>(() => {
    const parsed = parseReservationSchedule(exhibition.reservationSlots);
    if (parsed.length > 0) return parsed;
    // 일정이 비어 있으면 기본 날짜를 넣지 않음 (삭제 후 수정 화면에서 되살아나는 문제 방지)
    return [];
  });
  const [artworks, setArtworks] = useState<ArtworkDraft[]>(() =>
    initialArtworks.map((item) => ({
      id: item.id,
      title: item.title,
      material: item.material,
      price: item.price != null ? String(item.price) : "",
      imageUrl: item.imageUrl ?? "",
      imageFile: null,
      previewUrl: item.imageUrl ?? ""
    }))
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!heroImageFile) return;
    const objectUrl = URL.createObjectURL(heroImageFile);
    setHeroPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [heroImageFile]);

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  }

  function updateArtwork(
    index: number,
    field: keyof ArtworkDraft,
    value: string | File | null
  ) {
    setArtworks((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (field === "imageFile" && value instanceof File) {
          return {
            ...item,
            imageFile: value,
            previewUrl: URL.createObjectURL(value)
          };
        }
        return { ...item, [field]: value };
      })
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      let heroImageUrl = exhibition.heroImageUrl ?? undefined;
      let artistVideoUrl = exhibition.artistVideoUrl ?? undefined;

      if (heroImageFile) {
        heroImageUrl = await uploadFile(heroImageFile, "exhibitions/hero");
      }

      if (artistVideoFile) {
        artistVideoUrl = await uploadFile(artistVideoFile, "exhibitions/video");
      }

      const nextDescriptionImages = [...descriptionImages];
      for (const file of descriptionImageFiles) {
        nextDescriptionImages.push(
          await uploadFile(file, "exhibitions/description")
        );
      }

      const artworkPayload = [];
      for (const artwork of artworks) {
        if (!artwork.title.trim()) continue;

        let imageUrl = artwork.imageUrl || undefined;
        if (artwork.imageFile) {
          imageUrl = await uploadFile(artwork.imageFile, "artworks");
        }

        artworkPayload.push({
          id: artwork.id,
          title: artwork.title.trim(),
          material: artwork.material.trim() || "미정",
          price: artwork.price ? Number(artwork.price) : undefined,
          imageUrl
        });
      }

      const talk = resolveTalkReservation({
        reservable,
        schedule: talkSchedule
      });

      const response = await fetch(`/api/exhibitions/${exhibition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          region,
          district,
          venue,
          address,
          lat: Number(lat),
          lng: Number(lng),
          categories,
          exhibitionType,
          curationAvailable,
          summary,
          description,
          startDate,
          endDate,
          reservable: talk.reservable,
          todayOpen,
          heroImageUrl,
          descriptionImages: nextDescriptionImages,
          artistVideoTitle: artistVideoTitle || undefined,
          artistVideoDuration: artistVideoDuration || undefined,
          artistVideoUrl,
          reservationSchedule: talk.schedule,
          artworks: artworkPayload
        })
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "수정에 실패했습니다.");
        return;
      }

      router.push("/my");
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "수정 중 오류가 발생했습니다."
      );
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `「${exhibition.title}」 전시를 삭제할까요? 예약·저장·리뷰도 함께 삭제되며 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    const response = await fetch(`/api/exhibitions/${exhibition.id}`, {
      method: "DELETE"
    });
    const data = await response.json().catch(() => ({}));
    setDeleting(false);

    if (!response.ok) {
      setError(data.error ?? "전시 삭제에 실패했습니다.");
      return;
    }

    router.push("/my");
    router.refresh();
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <label>
        전시 제목
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
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
      <label>
        전시 유형
        <select value={exhibitionType} onChange={(e) => setExhibitionType(e.target.value)}>
          <option>개인 대관형 전시</option>
          <option>갤러리 초대전/기획전 전시</option>
          <option>페어형 전시</option>
        </select>
      </label>
      <fieldset className="checkbox-group">
        <legend>카테고리</legend>
        {CATEGORY_OPTIONS.map((category) => (
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
      <label>
        시작일
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <label>
        종료일
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </label>
      <label>
        한 줄 소개
        <input value={summary} onChange={(e) => setSummary(e.target.value)} required />
      </label>
      <label>
        전시 소개
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} required />
      </label>

      <div className="media-field">
        <p className="field-label">소개글 이미지 (선택, 여러 장 가능)</p>
        <p className="field-hint" style={{ marginTop: 0 }}>
          전시 등록 Step 2에서 올린 상세 이미지입니다. 삭제하거나 새 이미지를 추가할 수
          있습니다.
        </p>
        {descriptionImages.length > 0 ? (
          <div className="description-image-grid">
            {descriptionImages.map((src) => (
              <div key={src} className="description-image-item">
                <img src={src} alt="소개글 이미지" />
                <button
                  type="button"
                  onClick={() =>
                    setDescriptionImages((prev) =>
                      prev.filter((item) => item !== src)
                    )
                  }
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="media-preview empty">등록된 소개글 이미지가 없습니다</div>
        )}
        <label>
          이미지 추가
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) =>
              setDescriptionImageFiles(
                e.target.files ? Array.from(e.target.files) : []
              )
            }
          />
        </label>
        {descriptionImageFiles.length > 0 ? (
          <p className="field-hint">
            새로 선택한 이미지 {descriptionImageFiles.length}장이 저장 시 추가됩니다.
          </p>
        ) : null}
      </div>

      <div>
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

      <div className="media-field">
        <p className="field-label">전시 대표 이미지</p>
        {heroPreviewUrl ? (
          <div
            className="media-preview"
            style={{
              backgroundImage: `url(${heroPreviewUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
            aria-label="현재 대표 이미지 미리보기"
          />
        ) : (
          <div className="media-preview empty">등록된 이미지가 없습니다</div>
        )}
        <label>
          {heroPreviewUrl ? "대표 이미지 변경" : "대표 이미지 등록"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <p className="field-hint">새 파일을 고르지 않으면 현재 이미지가 유지됩니다.</p>
      </div>

      <label>
        작가 영상 제목
        <input
          value={artistVideoTitle}
          onChange={(e) => setArtistVideoTitle(e.target.value)}
        />
      </label>
      <label>
        작가 영상 길이
        <input
          value={artistVideoDuration}
          onChange={(e) => setArtistVideoDuration(e.target.value)}
          placeholder="01:00"
        />
      </label>
      <label>
        작가 영상 파일 변경
        <input
          type="file"
          accept="video/mp4,video/webm"
          onChange={(e) => setArtistVideoFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {exhibition.artistVideoUrl ? (
        <p className="field-hint">현재 영상이 등록되어 있습니다. 새 파일을 올리면 교체됩니다.</p>
      ) : null}

      <div className="artwork-form-list">
        <div className="artwork-form-list-head">
          <div>
            <p className="field-label">전시 작품 (선택)</p>
            <p className="field-hint" style={{ marginTop: 0 }}>
              기존 작품을 수정하거나, 새 작품을 추가할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setArtworks((prev) => [...prev, emptyArtwork()])}
          >
            작품 추가
          </button>
        </div>

        {artworks.length === 0 ? (
          <div className="empty-state">등록된 작품이 없습니다.</div>
        ) : null}

        {artworks.map((artwork, index) => (
          <div key={artwork.id ?? `new-${index}`} className="artwork-form-card">
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
            {artwork.previewUrl ? (
              <div
                className="media-preview compact"
                style={{
                  backgroundImage: `url(${artwork.previewUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
                aria-hidden="true"
              />
            ) : null}
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
      </div>

      <div className="checkbox-row">
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
                setTalkSchedule([
                  {
                    date: startDate || exhibition.startDate,
                    slots: [{ time: "14:00", capacity: 10 }]
                  }
                ]);
              }
            }}
          />
          작가와 대화 예약 가능
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={todayOpen} onChange={(e) => setTodayOpen(e.target.checked)} />
          오늘 오픈
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <Link className="secondary-button" href="/my">
          취소
        </Link>
        <button
          type="button"
          className="secondary-button warn-button"
          disabled={loading || deleting}
          onClick={handleDelete}
        >
          {deleting ? "삭제 중…" : "전시 삭제"}
        </button>
        <button type="submit" className="primary-button" disabled={loading || deleting}>
          {loading ? "저장 중..." : "변경 저장"}
        </button>
      </div>
    </form>
  );
}
