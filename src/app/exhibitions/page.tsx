import { ExhibitionsDirectoryClient } from "@/components/ExhibitionsDirectoryClient";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getListedExhibitions } from "@/lib/exhibitions";
import Link from "next/link";

export const revalidate = 60;

export const metadata = {
  title: "찾아낸 전시",
  description:
    "이번에 모습을 드러낸 동네 전시와 작가 공간. 조건으로 찾고, 지도에서 동선까지 이으세요.",
  alternates: { canonical: "/exhibitions" }
};

type ExhibitionsPageProps = {
  searchParams: Promise<{
    date?: string;
    source?: string;
    regions?: string;
    districts?: string;
    categories?: string;
    q?: string;
    curation?: string;
  }>;
};

function splitCsv(value?: string) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function toSource(value?: string): "all" | "artist" | "public" {
  if (value === "artist" || value === "public") return value;
  return "all";
}

function toDatePreset(value?: string): "all" | "today" | "this_week" {
  if (value === "today" || value === "this_week") return value;
  return "all";
}

function toCuration(value?: string): "all" | "curation" | "reservable" {
  if (value === "curation" || value === "reservable") return value;
  return "all";
}

export default async function ExhibitionsPage({
  searchParams
}: ExhibitionsPageProps) {
  const params = await searchParams;
  const exhibitions = await getListedExhibitions();

  const artistCount = exhibitions.filter(
    (item) => item.source === "ARTIST" || item.source === "ADMIN"
  ).length;
  const publicCount = exhibitions.filter(
    (item) => item.source === "PUBLIC_API"
  ).length;

  const datePreset = toDatePreset(params.date);
  const regions = splitCsv(params.regions);
  const districts = splitCsv(params.districts);
  const categories = splitCsv(params.categories);
  const curation = toCuration(params.curation);
  const query = params.q ?? "";
  const hasSearch =
    datePreset !== "all" ||
    regions.length > 0 ||
    districts.length > 0 ||
    categories.length > 0 ||
    curation !== "all" ||
    Boolean(query.trim());

  return (
    <>
      <Header activeTab="전시" />

      <main className="page-shell exhibitions-page">
        <header className="exhub-hero">
          <div className="exhub-hero-copy">
            <p className="eyebrow">못 찾겠다, 꾀꼬리?</p>
            <h1>이번에 찾아낸 전시</h1>
            <p>
              OOOF.가 동네에서 찾아낸 전시들입니다. 작가 공간을 먼저 발견하고,
              공공·기관 전시까지 이어서 훑어보세요. 필터로 단서를 좁히고, 지도에서
              동선까지 이어갈 수 있습니다.
            </p>
            <div className="exhub-hero-stats" aria-label="발견 현황">
              <div>
                <strong>{artistCount}</strong>
                <span>작가가 드러낸</span>
              </div>
              <div>
                <strong>{publicCount}</strong>
                <span>공공에서 찾은</span>
              </div>
              <div>
                <strong>{exhibitions.length}</strong>
                <span>발견된 전시</span>
              </div>
            </div>
            {hasSearch ? (
              <p className="field-hint" style={{ marginTop: 12 }}>
                지금 단서(검색 조건)가 적용된 결과입니다. 맞는 전시가 없으면 조건을
                조금 넓혀 다시 찾아보세요.
              </p>
            ) : null}
          </div>
          <div className="exhub-hero-actions">
            <Link className="primary-button" href="/map?layer=exhibition">
              지도에서 찾기
            </Link>
            <Link className="secondary-button" href="/register/exhibition">
              내 전시 드러내기
            </Link>
          </div>
        </header>

        <ExhibitionsDirectoryClient
          exhibitions={exhibitions}
          initialSource={toSource(params.source)}
          initialDate={datePreset}
          initialQuery={query}
          initialRegions={regions}
          initialDistricts={districts}
          initialCategories={categories}
          initialCuration={curation}
        />
      </main>

      <Footer />
    </>
  );
}
