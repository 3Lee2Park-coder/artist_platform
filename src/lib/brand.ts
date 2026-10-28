/** Product brand constants — keep UI/copy in sync with docs/brand */
export const BRAND = {
  mark: "OOOF.",
  /** Korean search / spoken form of OOOF. */
  koreanAlias: "우프",
  fullName: "Olly Olly Oxen Free",
  descriptor:
    "서울 동네 전시와 작가 공간, 전시 곁 산책 코스를 골라 알려주는 플랫폼",
  /**
   * Home `<title>` after the brand mark.
   * Campaign line 「못 찾겠다, 꾀꼬리?」 is reserved until brand recall is stronger.
   */
  seoTitle: "서울 동네 전시 · 작가 · 산책 코스",
  /** Meta description — search queries people actually type */
  seoDescription:
    "OOOF.(우프) — 지금 열린 서울 동네 전시와 작가 공간을 고르고, 전시 곁 카페·산책까지 코스로 묶어 알려드려요.",
  seoKeywords: [
    "OOOF",
    "OOOF.",
    "우프",
    "Olly Olly Oxen Free",
    "서울 가볼만한 곳",
    "서울 전시",
    "동네 전시",
    "서울 전시 일정",
    "전시 코스",
    "작가 공간",
    "서울 산책 코스",
    "전시 추천",
    "전시 지도",
    "큐레이션",
    "숨은 전시",
    "전시 근처 카페",
    "서울 숨은 장소",
    "전시 코스 추천"
  ] as const,
  campaignLine: "못 찾겠다, 꾀꼬리? OOOF.",
  productLine: "꼭꼭 숨은 전시를 찾다.",
  artistLine: "문을 열면, 찾아옵니다.",
  titleSuffix: "OOOF.",
  emailFromFallback: "OOOF. <onboarding@resend.dev>",
  emailSubjectPrefix: "[OOOF.]"
} as const;

export function brandTitle() {
  return `${BRAND.mark}(${BRAND.koreanAlias}) | ${BRAND.seoTitle}`;
}

export function withBrandTitle(pageTitle: string) {
  return `${pageTitle} | ${BRAND.titleSuffix}`;
}
