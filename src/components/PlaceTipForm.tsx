"use client";

import { PLACE_TIP_SITUATION_LABEL } from "@/lib/places";
import Link from "next/link";
import { FormEvent, useState } from "react";

type PlaceTipFormProps = {
  onDone?: () => void;
  defaultDistrict?: string;
};

async function uploadPlaceImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "place-tips");
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "이미지 업로드에 실패했습니다.");
  }
  return data.url as string;
}

export function PlaceTipForm({ onDone, defaultDistrict = "" }: PlaceTipFormProps) {
  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [situation, setSituation] = useState("AFTER");
  const [district, setDistrict] = useState(defaultDistrict);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadPlaceImage(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/place-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sourceUrl,
        situation,
        district,
        imageUrl
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        setError("LOGIN_REQUIRED");
      } else {
        setError(data.error ?? "제보에 실패했습니다.");
      }
      return;
    }

    setMessage("제보가 접수되었습니다. 검수 후 공개되면 알려 드릴게요.");
    setName("");
    setSourceUrl("");
    setImageUrl("");
    onDone?.();
  }

  return (
    <form className="place-tip-form" onSubmit={handleSubmit}>
      <label>
        장소명
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: ○○ 식당"
          required
          maxLength={80}
        />
      </label>
      <label>
        링크 <span className="auth-label-note">(선택)</span>
        <input
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="네이버 지도·인스타 등"
          type="url"
        />
      </label>
      <label>
        어울리는 상황
        <select
          value={situation}
          onChange={(event) => setSituation(event.target.value)}
          required
        >
          {Object.entries(PLACE_TIP_SITUATION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        동네
        <input
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
          placeholder="성수, 안국…"
          required
          maxLength={40}
        />
      </label>
      <label>
        사진 <span className="auth-label-note">(선택)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleImage(event.target.files?.[0] ?? null)}
          disabled={uploading}
        />
        {imageUrl ? <span className="auth-field-hint">사진이 첨부되었습니다.</span> : null}
      </label>

      {error === "LOGIN_REQUIRED" ? (
        <p className="form-error">
          제보하려면{" "}
          <Link href="/auth/login?redirect=/places">로그인</Link>이 필요합니다.
        </p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : null}
      {message ? <p className="auth-field-hint">{message}</p> : null}

      <button
        type="submit"
        className="primary-button"
        disabled={loading || uploading}
      >
        {loading ? "보내는 중…" : "제보하기"}
      </button>
    </form>
  );
}
