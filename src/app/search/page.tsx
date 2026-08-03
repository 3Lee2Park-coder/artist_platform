import { redirect } from "next/navigation";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * 예전 /search 링크 호환.
 * 메뉴 «전시»와 필터 결과는 /exhibitions 디렉터리로 모읍니다.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      const joined = value.filter(Boolean).join(",");
      if (joined) query.set(key, joined);
    }
  }

  const suffix = query.toString();
  redirect(suffix ? `/exhibitions?${suffix}` : "/exhibitions");
}
