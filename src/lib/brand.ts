/** Product brand constants — keep UI/copy in sync with docs/brand */
export const BRAND = {
  mark: "OOOF.",
  /** Korean search / spoken form of OOOF. */
  koreanAlias: "우프",
  fullName: "Olly Olly Oxen Free",
  descriptor:
    "서울 가볼만한 곳, 동네 전시·작가 공간, 데이트 코스를 찾아 알려주는 플랫폼",
  /**
   * Home `<title>` after the brand mark.
   * Campaign line 「못 찾겠다, 꾀꼬리?」 is reserved until brand recall is stronger.
   */
  seoTitle: "서울 가볼만한 곳 · 전시 데이트 코스",
  /** Meta description — search queries people actually type */
  seoDescription:
    "OOOF.(우프) — 서울 가볼만한 곳, 숨은 동네 전시·작가 공간, 데이트·놀거리 코스를 찾아 알려주는 플랫폼. Olly Olly Oxen Free.",
  seoKeywords: [
    "OOOF",
    "OOOF.",
    "우프",
    "Olly Olly Oxen Free",
    "서울 가볼만한 곳",
    "서울 데이트 코스",
    "전시 데이트",
    "동네 전시",
    "전시 추천",
    "전시 지도",
    "작가 공간",
    "큐레이션",
    "전시 코스",
    "놀거리",
    "숨은 전시"
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
