export const REGION_GROUPS = [
  {
    region: "서울",
    districts: ["성수", "한남", "홍대", "삼청", "연남", "이태원", "강남", "서촌", "종로", "용산"]
  },
  {
    region: "경기",
    districts: ["의정부", "수원", "성남", "고양", "파주", "용인", "과천"]
  },
  {
    region: "강원",
    districts: ["춘천", "강릉", "원주", "속초"]
  },
  {
    region: "부산",
    districts: ["해운대", "영도", "서면", "광안리", "남포"]
  },
  {
    region: "인천",
    districts: ["송도", "구월", "개항장", "부평"]
  },
  {
    region: "대구",
    districts: ["동성로", "수성", "중구"]
  },
  {
    region: "광주",
    districts: ["동명", "양림", "충장"]
  },
  {
    region: "대전",
    districts: ["둔산", "은행", "유성"]
  },
  {
    region: "제주",
    districts: ["제주시", "서귀포", "애월"]
  }
] as const;

const REGION_KEYWORDS: Array<{ region: RegionName | string; keywords: string[] }> = [
  { region: "서울", keywords: ["서울", "서울특별시"] },
  { region: "경기", keywords: ["경기", "경기도", "과천", "수원", "성남", "용인", "고양", "파주"] },
  { region: "강원", keywords: ["강원", "강원특별자치도", "춘천", "강릉", "원주", "속초"] },
  { region: "부산", keywords: ["부산", "부산광역시", "해운대"] },
  { region: "인천", keywords: ["인천", "인천광역시", "송도"] },
  { region: "대구", keywords: ["대구", "대구광역시"] },
  { region: "광주", keywords: ["광주", "광주광역시"] },
  { region: "대전", keywords: ["대전", "대전광역시", "유성"] },
  { region: "제주", keywords: ["제주", "제주특별자치도", "서귀포"] },
  { region: "충북", keywords: ["충북", "충청북도", "청주"] },
  { region: "충남", keywords: ["충남", "충청남도", "천안", "아산"] },
  { region: "전북", keywords: ["전북", "전라북도", "전주"] },
  { region: "전남", keywords: ["전남", "전라남도", "여수", "목포"] },
  { region: "경북", keywords: ["경북", "경상북도", "경주", "포항"] },
  { region: "경남", keywords: ["경남", "경상남도", "창원"] }
];

/** 등록 시 제안용 동네 목록 (강제 아님 — 자유 입력 가능) */
export const DISTRICT_SUGGESTIONS = Array.from(
  new Set(REGION_GROUPS.flatMap((group) => [...group.districts]))
);

export type RegionName = (typeof REGION_GROUPS)[number]["region"];

export function getDistrictsByRegion(region: string) {
  return (
    REGION_GROUPS.find((group) => group.region === region)?.districts ?? []
  );
}

export function getDefaultDistrict(region: string) {
  return getDistrictsByRegion(region)[0] ?? "";
}

export function inferRegionFromAddress(address: string) {
  return inferRegionFromText(address);
}

/** 주소·기관명·EVENT_SITE 등 자유 텍스트에서 광역 지역 추정 */
export function inferRegionFromText(text: string) {
  const normalized = text.replace(/\s+/g, "");

  for (const entry of REGION_KEYWORDS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword.replace(/\s+/g, "")))) {
      return entry.region;
    }
  }

  return "기타";
}

/**
 * 주소/다음 API 보조값으로 동네명을 추정.
 * 알려진 핫스팟이 없으면 법정동·시군구 등 자유 텍스트를 그대로 사용.
 */
export function inferDistrictFromAddress(
  address: string,
  region: string,
  extras?: { bname?: string; sigungu?: string }
) {
  const known = getDistrictsByRegion(region);
  const knownHit = known.find((district) => address.includes(district));
  if (knownHit) return knownHit;

  const suggestionHit = DISTRICT_SUGGESTIONS.find((district) =>
    address.includes(district)
  );
  if (suggestionHit) return suggestionHit;

  const bname = extras?.bname?.replace(/(동|가|리)$/, "").trim();
  if (bname && bname.length >= 2) return bname;

  const sigungu = extras?.sigungu
    ?.replace(/(특별시|광역시|특별자치시|특별자치도|시|군|구)$/g, "")
    .trim();
  if (sigungu && sigungu.length >= 2) return sigungu;

  return getDefaultDistrict(region) || "기타";
}

/** 큐레이션 동네 ↔ 전시 district 느슨한 매칭 */
export function districtMatchesNeighborhood(
  district: string,
  neighborhood: string
) {
  const a = district.trim().toLowerCase();
  const b = neighborhood.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}
