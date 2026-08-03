"use client";

import {
  DISTRICT_SUGGESTIONS,
  getDefaultDistrict,
  getDistrictsByRegion,
  inferDistrictFromAddress,
  inferRegionFromAddress,
  REGION_GROUPS
} from "@/lib/locations";
import { useState } from "react";
import DaumPostcodeEmbed from "react-daum-postcode";

type DaumAddressData = {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  bname?: string;
  sigungu?: string;
};

type AddressSearchFieldProps = {
  region: string;
  district: string;
  venue: string;
  address: string;
  lat: string;
  lng: string;
  onRegionChange: (region: string) => void;
  onDistrictChange: (district: string) => void;
  onVenueChange: (venue: string) => void;
  onAddressChange: (address: string) => void;
  onLatChange: (lat: string) => void;
  onLngChange: (lng: string) => void;
  onError?: (message: string) => void;
};

export function AddressSearchField({
  region,
  district,
  venue,
  address,
  lat,
  lng,
  onRegionChange,
  onDistrictChange,
  onVenueChange,
  onAddressChange,
  onLatChange,
  onLngChange,
  onError
}: AddressSearchFieldProps) {
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const suggestions = Array.from(
    new Set([...getDistrictsByRegion(region), ...DISTRICT_SUGGESTIONS])
  );

  function handleRegionChange(nextRegion: string) {
    onRegionChange(nextRegion);
    // 기존 동네가 자유 입력이면 유지, 비어 있을 때만 기본값
    if (!district.trim()) {
      onDistrictChange(getDefaultDistrict(nextRegion));
    }
  }

  async function geocodeAddress(nextAddress: string) {
    setGeocoding(true);

    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: nextAddress })
      });
      const data = await response.json();

      if (!response.ok) {
        onError?.(data.error ?? "주소 좌표 변환에 실패했습니다.");
        return;
      }

      onLatChange(String(data.lat));
      onLngChange(String(data.lng));
    } catch {
      onError?.("주소 좌표 변환 중 오류가 발생했습니다.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleComplete(data: DaumAddressData) {
    const selectedAddress = data.roadAddress || data.address || data.jibunAddress;
    const inferredRegion = inferRegionFromAddress(selectedAddress);
    const inferredDistrict = inferDistrictFromAddress(selectedAddress, inferredRegion, {
      bname: data.bname,
      sigungu: data.sigungu
    });

    onAddressChange(selectedAddress);
    onRegionChange(inferredRegion);
    onDistrictChange(inferredDistrict);
    setPostcodeOpen(false);
    await geocodeAddress(selectedAddress);
  }

  return (
    <div className="address-search-field full-width">
      <div className="form-grid compact-grid">
        <label>
          광역 지역
          <select
            value={region}
            onChange={(event) => handleRegionChange(event.target.value)}
          >
            {REGION_GROUPS.map((group) => (
              <option key={group.region} value={group.region}>
                {group.region}
              </option>
            ))}
          </select>
        </label>

        <label>
          세부 지역 (동네)
          <input
            list="district-suggestions"
            value={district}
            onChange={(event) => onDistrictChange(event.target.value)}
            placeholder="예: 성수, 문래, 을지로, 한남…"
            required
          />
          <datalist id="district-suggestions">
            {suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
      </div>
      <p className="field-hint">
        고정 목록이 아닙니다. 주소 검색으로 자동 채우거나, 작가가 쓰는 동네명을 직접
        입력하세요. (문래, 을지로, 성북 등)
      </p>

      <label>
        전시장명
        <input
          value={venue}
          onChange={(event) => onVenueChange(event.target.value)}
          required
        />
      </label>

      <label>
        도로명 주소
        <div className="address-input-row">
          <input value={address} onChange={(event) => onAddressChange(event.target.value)} required />
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPostcodeOpen((open) => !open)}
          >
            주소 검색
          </button>
        </div>
      </label>

      {postcodeOpen ? (
        <div className="postcode-panel">
          <DaumPostcodeEmbed onComplete={handleComplete} autoClose={false} />
        </div>
      ) : null}

      <div className="form-grid compact-grid">
        <label>
          위도 (자동 입력)
          <input value={lat} onChange={(event) => onLatChange(event.target.value)} required />
        </label>
        <label>
          경도 (자동 입력)
          <input value={lng} onChange={(event) => onLngChange(event.target.value)} required />
        </label>
      </div>

      <p className="field-hint">
        {geocoding
          ? "주소를 좌표로 변환하는 중입니다."
          : "주소 검색 후 좌표가 자동 입력됩니다. 실패 시 좌표를 직접 입력할 수 있습니다."}
      </p>
    </div>
  );
}
