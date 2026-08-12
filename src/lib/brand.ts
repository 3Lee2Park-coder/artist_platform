/** Product brand constants — keep UI/copy in sync with docs/brand */
export const BRAND = {
  mark: "OOOF.",
  /** Korean search / spoken form of OOOF. */
  koreanAlias: "우프",
  fullName: "Olly Olly Oxen Free",
  descriptor: "꼭꼭 숨은 동네 전시·작가 공간을 찾아 알려주는 플랫폼",
  /** Meta description — includes hangul brand query people type in search */
  seoDescription:
    "OOOF.(우프) — 꼭꼭 숨은 동네 전시·작가 공간을 찾아 알려주는 플랫폼. Olly Olly Oxen Free.",
  campaignLine: "못 찾겠다, 꾀꼬리? OOOF.",
  productLine: "꼭꼭 숨은 전시를 찾다.",
  artistLine: "문을 열면, 찾아옵니다.",
  titleSuffix: "OOOF.",
  emailFromFallback: "OOOF. <onboarding@resend.dev>",
  emailSubjectPrefix: "[OOOF.]"
} as const;

export function withBrandTitle(pageTitle: string) {
  return `${pageTitle} | ${BRAND.titleSuffix}`;
}
