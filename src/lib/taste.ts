// 온보딩 단계에서 수집하는 관람 취향 옵션

export const INTEREST_CATEGORIES = [
  "현대미술",
  "회화",
  "사진",
  "조각·설치",
  "미디어아트",
  "드로잉·일러스트",
  "공예·디자인",
  "팝업·브랜드"
] as const;

export const VISIT_PURPOSES = [
  "감상·몰입",
  "데이트",
  "가족·아이와",
  "사진 촬영",
  "산책 겸",
  "시간 때우기",
  "영감·레퍼런스"
] as const;

// 리뷰 작성 시 선택적으로 붙일 수 있는 무드 태그
export const REVIEW_MOOD_TAGS = [
  "몰입감 최고",
  "사진 찍기 좋아요",
  "공간이 넓어요",
  "아늑해요",
  "재방문 의사 있어요",
  "동선이 편해요",
  "설명이 친절해요",
  "가성비 좋아요"
] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];
export type VisitPurpose = (typeof VISIT_PURPOSES)[number];
export type ReviewMoodTag = (typeof REVIEW_MOOD_TAGS)[number];

export function parseTasteArray(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
