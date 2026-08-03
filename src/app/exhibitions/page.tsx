import { ExhibitionsDirectoryClient } from "@/components/ExhibitionsDirectoryClient";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";
import {
  annotateViewerState,
  getListedExhibitions
} from "@/lib/exhibitions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "전시 | Exhibit",
  description:
    "작가 등록 전시와 공공·기관 전시를 한곳에서. 위치·필터로 지금 볼 전시를 찾으세요."
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
  const session = await getSession();
  const listed = await getListedExhibitions();
  const exhibitions = await annotateViewerState(listed, session?.id);

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
            <p className="eyebrow">Exhibition hub</p>
            <h1>지금 볼 수 있는 전시</h1>
            <p>
              작가 공간의 전시를 먼저 만나고, 박물관·미술관 정보까지 이어서
              둘러보세요. 조건으로 걸러 보고, 지도에서 가까운 동선도 확인할 수
              있습니다.
            </p>
            <div className="exhub-hero-stats" aria-label="전시 현황">
              <div>
                <strong>{artistCount}</strong>
                <span>작가 등록</span>
              </div>
              <div>
                <strong>{publicCount}</strong>
                <span>공공·기관</span>
              </div>
              <div>
                <strong>{exhibitions.length}</strong>
                <span>전체</span>
              </div>
            </div>
            {hasSearch ? (
              <p className="field-hint" style={{ marginTop: 12 }}>
                상단 검색 조건이 적용된 결과입니다. 조건에 맞는 전시가 없으면 아래
                안내가 표시됩니다.
              </p>
            ) : null}
          </div>
          <div className="exhub-hero-actions">
            <Link className="primary-button" href="/map?layer=exhibition">
              내 주변에서 찾기
            </Link>
            <Link className="secondary-button" href="/register/exhibition">
              내 전시 등록
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
