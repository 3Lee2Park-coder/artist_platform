export const KOREA_MAP_CENTER = { lat: 36.2, lng: 127.85 };
export const KOREA_MAP_ZOOM = 7;

/** CulturePick 순서를 따른 광역 지역 필터 */
export const MAP_REGION_FILTERS = [
  { id: "all", label: "전국" },
  { id: "서울", label: "서울" },
  { id: "경기", label: "경기" },
  { id: "인천", label: "인천" },
  { id: "부산", label: "부산" },
  { id: "대구", label: "대구" },
  { id: "광주", label: "광주" },
  { id: "대전", label: "대전" },
  { id: "울산", label: "울산" },
  { id: "세종", label: "세종" },
  { id: "강원", label: "강원" },
  { id: "충북", label: "충북" },
  { id: "충남", label: "충남" },
  { id: "전북", label: "전북" },
  { id: "전남", label: "전남" },
  { id: "경북", label: "경북" },
  { id: "경남", label: "경남" },
  { id: "제주", label: "제주" }
] as const;

export type MapRegionId = (typeof MAP_REGION_FILTERS)[number]["id"];

export const MAP_REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  서울: { lat: 37.5665, lng: 126.978 },
  경기: { lat: 37.4138, lng: 127.5183 },
  인천: { lat: 37.4563, lng: 126.7052 },
  부산: { lat: 35.1796, lng: 129.0756 },
  대구: { lat: 35.8714, lng: 128.6014 },
  광주: { lat: 35.1595, lng: 126.8526 },
  대전: { lat: 36.3504, lng: 127.3845 },
  울산: { lat: 35.5384, lng: 129.3114 },
  세종: { lat: 36.48, lng: 127.289 },
  강원: { lat: 37.8228, lng: 128.1555 },
  충북: { lat: 36.6357, lng: 127.4917 },
  충남: { lat: 36.5184, lng: 126.8 },
  전북: { lat: 35.82, lng: 127.109 },
  전남: { lat: 34.8161, lng: 126.4629 },
  경북: { lat: 36.4919, lng: 128.8889 },
  경남: { lat: 35.4606, lng: 128.2132 },
  제주: { lat: 33.4996, lng: 126.5312 }
};

const MAP_REGION_ZOOM: Record<string, number> = {
  all: KOREA_MAP_ZOOM,
  서울: 11,
  경기: 9,
  인천: 11,
  부산: 11,
  대구: 11,
  광주: 11,
  대전: 11,
  울산: 11,
  세종: 12,
  강원: 8,
  충북: 9,
  충남: 9,
  전북: 9,
  전남: 8,
  경북: 8,
  경남: 9,
  제주: 10
};

export function mapRegionCenter(regionId: string) {
  if (regionId === "all") {
    return KOREA_MAP_CENTER;
  }

  return MAP_REGION_CENTERS[regionId] ?? MAP_REGION_CENTERS.서울;
}

export function mapRegionZoom(regionId: string) {
  return MAP_REGION_ZOOM[regionId] ?? 10;
}

export function isKnownMapRegion(value: string) {
  return MAP_REGION_FILTERS.some((item) => item.id === value);
}
