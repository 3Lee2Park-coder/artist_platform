/**
 * PM이 2026-10-27에 승인한 중복 전시 19쌍.
 * key(loser)로 들어오면 value(keeper)로 영구 리다이렉트한다.
 */
export const EXHIBITION_REDIRECTS: Record<string, string> = {
  "cultureinfo-387427": "public-1132477",
  "public-10029838": "cultureinfo-377604",
  "cultureinfo-385020": "public-771",
  "public-181": "cultureinfo-385019",
  "cultureinfo-375293": "public-775",
  "cultureinfo-369772": "public-EM_0000009294",
  "cultureinfo-359174": "public-SPCLEXHT_00000000403",
  "cultureinfo-373581": "public-EM_0000009385",
  "cultureinfo-364983": "public-202601060002026",
  "cultureinfo-338921": "public-202508060001987",
  "cultureinfo-364984": "public-202601060002027",
  "cultureinfo-345441": "public-202508210001995",
  "cultureinfo-364986": "public-202601060002024",
  "cultureinfo-347140": "public-139",
  "cultureinfo-364451": "public-202512310002018",
  "cultureinfo-364985": "public-202601060002022",
  "cultureinfo-376588": "public-202603300002070",
  "cultureinfo-379281": "public-EM_0000009471",
  "cultureinfo-336194": "public-202507100001975"
};

/** 공식 종료일이 확인된 keeper. 이 값과 다르면 그 쌍만 숨기지 않는다. */
export const KEEPER_END_DATES: Record<string, string> = {
  "public-775": "2026-12-31",
  "public-SPCLEXHT_00000000403": "2028-12-31",
  "public-202601060002026": "2027-10-31",
  "public-202508060001987": "2027-07-31",
  "public-202603300002070": "2027-02-28"
};
