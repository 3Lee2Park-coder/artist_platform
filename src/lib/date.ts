/** KST(한국 시간) 기준 오늘 날짜 YYYY-MM-DD */
export function getTodayKST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul"
  }).format(new Date());
}

export function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-가-힣]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return `exhibition-${Date.now()}`;
  }

  return slug;
}
