import { geocodeAddressServer } from "@/lib/geocode-server";
import {
  inferDistrictFromAddress,
  inferRegionFromText
} from "@/lib/locations";

export type PublicLocationInput = {
  institution: string;
  eventSite: string;
  spatialCoverage?: string;
};

export type ResolvedPublicLocation = {
  region: string;
  district: string;
  venue: string;
  address: string;
  geocodeQuery: string;
  lat?: number;
  lng?: number;
};

type InstitutionAnchor = {
  region: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  /** EVENT_SITE 값과 매칭 (없으면 기본관) */
  sites?: Record<string, Omit<InstitutionAnchor, "sites">>;
};

/** 자주 등장하는 공공기관·미술관 좌표 (API 지오코딩 보조) */
const INSTITUTION_ANCHORS: Record<string, InstitutionAnchor> = {
  국립현대미술관: {
    region: "경기",
    district: "과천",
    address: "경기도 과천시 막계동 280-2",
    lat: 37.4367,
    lng: 127.0198,
    sites: {
      과천: {
        region: "경기",
        district: "과천",
        address: "경기도 과천시 막계동 280-2",
        lat: 37.4367,
        lng: 127.0198
      },
      서울: {
        region: "서울",
        district: "종로",
        address: "서울특별시 종로구 삼청로 30",
        lat: 37.5795,
        lng: 126.9804
      },
      덕수: {
        region: "서울",
        district: "정동",
        address: "서울특별시 중구 세종대로 99",
        lat: 37.5658,
        lng: 126.9751
      }
    }
  },
  국립춘천박물관: {
    region: "강원",
    district: "춘천",
    address: "강원특별자치도 춘천시 봉의산길 38",
    lat: 37.8813,
    lng: 127.7298
  },
  국립중앙박물관: {
    region: "서울",
    district: "용산",
    address: "서울특별시 용산구 서빙고로 137",
    lat: 37.524,
    lng: 126.9804
  },
  "국립민속박물관": {
    region: "서울",
    district: "종로",
    address: "서울특별시 종로구 삼청로 37",
    lat: 37.5814,
    lng: 126.9836
  },
  "국립어린이박물관": {
    region: "경기",
    district: "과천",
    address: "경기도 과천시 막계동 280-2",
    lat: 37.4367,
    lng: 127.0198
  }
};

const CITY_SITE_HINTS = new Set([
  "과천",
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "제주",
  "수원",
  "춘천",
  "강릉"
]);

function normalizeSite(site: string) {
  return site.trim().replace(/\s+/g, "");
}

function matchInstitutionAnchor(institution: string, eventSite: string) {
  const anchorKey = Object.keys(INSTITUTION_ANCHORS).find((key) =>
    institution.includes(key)
  );
  if (!anchorKey) {
    return null;
  }

  const anchor = INSTITUTION_ANCHORS[anchorKey];
  const normalizedSite = normalizeSite(eventSite);

  if (anchor.sites) {
    const siteKey = Object.keys(anchor.sites).find(
      (key) =>
        normalizedSite === normalizeSite(key) ||
        normalizedSite.startsWith(normalizeSite(key))
    );
    if (siteKey) {
      return { ...anchor.sites[siteKey], venue: institution };
    }
  }

  return { ...anchor, venue: institution };
}

function isRoomLikeEventSite(eventSite: string) {
  if (!eventSite.trim()) {
    return false;
  }

  if (CITY_SITE_HINTS.has(eventSite.trim())) {
    return false;
  }

  return /층|관|실|홀|전시|센터|브랜드|갤러리|룸|동/.test(eventSite);
}

export function resolvePublicExhibitionLocation(
  input: PublicLocationInput
): ResolvedPublicLocation {
  const institution = input.institution.trim() || "문화시설";
  const eventSite = input.eventSite.trim();
  const spatialCoverage = input.spatialCoverage?.trim() ?? "";
  const anchor = matchInstitutionAnchor(institution, eventSite);

  if (anchor) {
    return {
      region: anchor.region,
      district: anchor.district,
      venue: anchor.venue ?? institution,
      address: anchor.address,
      geocodeQuery: anchor.address,
      lat: anchor.lat,
      lng: anchor.lng
    };
  }

  const locationText = [spatialCoverage, institution, eventSite].filter(Boolean).join(" ");
  const region = inferRegionFromText(locationText);
  const district = CITY_SITE_HINTS.has(eventSite)
    ? eventSite
    : inferDistrictFromAddress(locationText, region, {
        sigungu: isRoomLikeEventSite(eventSite) ? institution : eventSite
      });

  const geocodeQuery = isRoomLikeEventSite(eventSite)
    ? institution
    : [institution, eventSite].filter(Boolean).join(" ");

  return {
    region,
    district,
    venue: institution,
    address: spatialCoverage || geocodeQuery,
    geocodeQuery
  };
}

export async function enrichPublicLocation(
  base: ResolvedPublicLocation
): Promise<ResolvedPublicLocation> {
  if (base.lat != null && base.lng != null) {
    return base;
  }

  const geocoded = await geocodeAddressServer(base.geocodeQuery);
  if (!geocoded) {
    return base;
  }

  const region = inferRegionFromText(geocoded.formattedAddress) || base.region;
  const district =
    inferDistrictFromAddress(geocoded.formattedAddress, region) || base.district;

  return {
    ...base,
    region,
    district,
    address: geocoded.formattedAddress,
    lat: geocoded.lat,
    lng: geocoded.lng
  };
}

export function defaultCoordsForRegion(region: string) {
  const map: Record<string, { lat: number; lng: number }> = {
    서울: { lat: 37.5665, lng: 126.978 },
    경기: { lat: 37.4138, lng: 127.5183 },
    강원: { lat: 37.8854, lng: 127.7298 },
    부산: { lat: 35.1796, lng: 129.0756 },
    인천: { lat: 37.4563, lng: 126.7052 },
    대구: { lat: 35.8714, lng: 128.6014 },
    광주: { lat: 35.1595, lng: 126.8526 },
    대전: { lat: 36.3504, lng: 127.3845 },
    제주: { lat: 33.4996, lng: 126.5312 },
    충북: { lat: 36.6357, lng: 127.4917 },
    충남: { lat: 36.5184, lng: 126.8 },
    전북: { lat: 35.8242, lng: 127.148 },
    전남: { lat: 34.8161, lng: 126.4629 },
    경북: { lat: 36.576, lng: 128.5056 },
    경남: { lat: 35.2284, lng: 128.6811 }
  };

  return map[region] ?? map.서울;
}
