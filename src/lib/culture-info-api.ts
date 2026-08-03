import { getTodayKST } from "@/lib/date";
import {
  normalizePublicHeroImageUrl,
  stripHtml,
  trustPublicHeroImageUrl
} from "@/lib/public-exhibition-text";
import { prisma } from "@/lib/prisma";

/**
 * 한국문화정보원 «한눈에보는문화정보조회서비스»
 * Base: https://apis.data.go.kr/B553457/cultureinfo
 * - period2: 기간별 목록 (serviceTp=A → 전시만)
 * - detail2: 상세
 *
 * 주의: 이 API는 pageNo/numOfRows 가 아니라 **PageNo / numOfrows** 파라미터만 인식한다.
 */
const API_BASE =
  process.env.CULTURE_INFO_API_URL?.trim() ||
  "https://apis.data.go.kr/B553457/cultureinfo";

/** 페이지당 실제 반환 건수(API 고정) */
const PAGE_SIZE = 10;

export type CultureInfoItem = {
  seq: string;
  title: string;
  startDate: string;
  endDate: string;
  place: string;
  realmName: string;
  area: string;
  sigungu: string;
  thumbnail?: string;
  lat?: number;
  lng?: number;
  price?: string;
  url?: string;
  placeAddr?: string;
  phone?: string;
  contents?: string;
};

type SyncOptions = {
  maxPages?: number;
  fromDate?: string;
  toDate?: string;
  keywords?: string[];
  placeIncludes?: string[];
  enrichDetails?: boolean;
  detailLimit?: number;
  activeOnly?: boolean;
  /** A=전시 (문화포털 serviceTp). 기본 A */
  serviceTp?: string;
  /** HEAD 이미지 검증 생략 (대량 sync 속도용) */
  fastImageTrust?: boolean;
};

type SyncResult = {
  scanned: number;
  imported: number;
  updated: number;
  skipped: number;
  invalidImages: number;
  detailsFetched: number;
  pagesFetched: number;
};

function getServiceKeyEncoded() {
  const raw = process.env.CULTURE_INFO_API_KEY?.trim();
  if (!raw) {
    throw new Error("CULTURE_INFO_API_KEY 환경 변수가 설정되지 않았습니다.");
  }
  return raw.includes("%") ? raw : encodeURIComponent(raw);
}

function ymdToIso(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function isoToYmd(iso: string) {
  return iso.replace(/-/g, "");
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function readXmlTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  let value = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  for (let i = 0; i < 2; i += 1) {
    value = value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&times;/gi, "×");
  }
  return value;
}

function isExhibitionItem(serviceName: string, realmName: string) {
  const hay = `${serviceName} ${realmName}`;
  return hay.includes("전시");
}

function mapCategories(realmName: string) {
  if (realmName.includes("사진")) return ["사진"];
  if (realmName.includes("조각")) return ["조각"];
  if (realmName.includes("미디어") || realmName.includes("복합")) return ["복합"];
  return ["회화"];
}

function parseTotalCount(xml: string) {
  const match = xml.match(/<totalCount>(\d+)<\/totalCount>/i);
  return match ? Number(match[1]) : 0;
}

function parseListItems(xml: string): CultureInfoItem[] {
  const items: CultureInfoItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const serviceName = readXmlTag(block, "serviceName");
    const realmName = readXmlTag(block, "realmName") || "전시";
    if (!isExhibitionItem(serviceName, realmName)) continue;

    const seq = readXmlTag(block, "seq");
    const title = readXmlTag(block, "title");
    const startDate = ymdToIso(readXmlTag(block, "startDate"));
    const endDate = ymdToIso(readXmlTag(block, "endDate"));
    if (!seq || !title || !startDate || !endDate) continue;

    const gpsX = Number(readXmlTag(block, "gpsX"));
    const gpsY = Number(readXmlTag(block, "gpsY"));
    const lng = Number.isFinite(gpsX) ? gpsX : undefined;
    const lat = Number.isFinite(gpsY) ? gpsY : undefined;

    items.push({
      seq,
      title,
      startDate,
      endDate,
      place: readXmlTag(block, "place") || "문화시설",
      realmName,
      area: readXmlTag(block, "area") || "전국",
      sigungu: readXmlTag(block, "sigungu") || "",
      thumbnail: readXmlTag(block, "thumbnail") || undefined,
      lat,
      lng
    });
  }

  return items;
}

function parseDetailItem(xml: string): Partial<CultureInfoItem> | null {
  const block = xml.match(/<item>[\s\S]*?<\/item>/i)?.[0];
  if (!block) return null;

  const gpsX = Number(readXmlTag(block, "gpsX"));
  const gpsY = Number(readXmlTag(block, "gpsY"));

  return {
    price: readXmlTag(block, "price") || undefined,
    url: readXmlTag(block, "url") || undefined,
    placeAddr: readXmlTag(block, "placeAddr") || undefined,
    phone: readXmlTag(block, "phone") || undefined,
    contents: stripHtml(readXmlTag(block, "contents1") || readXmlTag(block, "contents") || ""),
    thumbnail:
      readXmlTag(block, "imgUrl") || readXmlTag(block, "thumbnail") || undefined,
    lat: Number.isFinite(gpsY) ? gpsY : undefined,
    lng: Number.isFinite(gpsX) ? gpsX : undefined
  };
}

async function fetchXml(pathAndQuery: string) {
  const response = await fetch(`${API_BASE}${pathAndQuery}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`문화정보 API 요청 실패 (${response.status})`);
  }
  const xml = await response.text();
  const resultCode = xml.match(/<resultCode>(.*?)<\/resultCode>/)?.[1];
  if (resultCode && resultCode !== "00" && resultCode !== "0000") {
    const msg = xml.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1] ?? "UNKNOWN";
    throw new Error(`문화정보 API 오류: ${resultCode} ${msg}`);
  }
  return xml;
}

async function fetchPeriodPage(params: {
  pageNo: number;
  fromYmd: string;
  toYmd: string;
  keyword?: string;
  serviceTp?: string;
}) {
  const key = getServiceKeyEncoded();
  const query = new URLSearchParams();
  query.set("PageNo", String(params.pageNo));
  query.set("numOfrows", String(PAGE_SIZE));
  query.set("from", params.fromYmd);
  query.set("to", params.toYmd);
  if (params.serviceTp) query.set("serviceTp", params.serviceTp);
  if (params.keyword) query.set("keyword", params.keyword);

  const xml = await fetchXml(`/period2?serviceKey=${key}&${query.toString()}`);
  return {
    items: parseListItems(xml),
    totalCount: parseTotalCount(xml)
  };
}

async function fetchDetail(seq: string) {
  const key = getServiceKeyEncoded();
  const xml = await fetchXml(`/detail2?serviceKey=${key}&seq=${encodeURIComponent(seq)}`);
  return parseDetailItem(xml);
}

function buildDescription(item: CultureInfoItem) {
  const parts = [
    item.contents?.trim() || `${item.title} — ${item.place}에서 진행되는 전시입니다.`,
    "",
    "※ 한국문화정보원 «한눈에보는문화정보» 기반 전시입니다."
  ];
  if (item.price) parts.push(`관람료: ${item.price}`);
  if (item.phone) parts.push(`문의: ${item.phone}`);
  if (item.url) parts.push(`출처: ${item.url}`);
  return parts.join("\n");
}

function isActive(item: CultureInfoItem, today: string) {
  return item.startDate <= today && item.endDate >= today;
}

function matchesPlaceFilter(item: CultureInfoItem, placeIncludes?: string[]) {
  if (!placeIncludes?.length) return true;
  const hay = `${item.place} ${item.title}`;
  return placeIncludes.some((needle) => hay.includes(needle));
}

async function upsertItem(
  base: CultureInfoItem,
  options: {
    enrichDetails: boolean;
    detailsUsed: number;
    detailLimit: number;
    fastImageTrust: boolean;
  },
  result: SyncResult
) {
  let item = { ...base };
  if (options.enrichDetails && options.detailsUsed < options.detailLimit) {
    try {
      const detail = await fetchDetail(base.seq);
      result.detailsFetched += 1;
      options.detailsUsed += 1;
      if (detail) {
        item = {
          ...item,
          ...detail,
          thumbnail: detail.thumbnail || item.thumbnail,
          lat: detail.lat ?? item.lat,
          lng: detail.lng ?? item.lng
        };
      }
    } catch {
      // list-only fallback
    }
  }

  const heroImageUrl = options.fastImageTrust
    ? trustPublicHeroImageUrl(item.thumbnail)
    : await normalizePublicHeroImageUrl(item.thumbnail);

  if (!heroImageUrl) {
    if (item.thumbnail) result.invalidImages += 1;
    result.skipped += 1;
    return options.detailsUsed;
  }

  if (item.lat == null || item.lng == null) {
    result.skipped += 1;
    return options.detailsUsed;
  }

  const id = `cultureinfo-${item.seq}`;
  const region = item.area || "전국";
  const district = item.sigungu || item.area || "미정";
  const address =
    item.placeAddr || [region, district, item.place].filter(Boolean).join(" ");
  const summary =
    (item.contents?.trim().slice(0, 180) ||
      `${item.place} · ${item.startDate}~${item.endDate}`) ??
    item.title;

  const payload = {
    title: item.title,
    artist: item.place || "기관 기획",
    region,
    district,
    venue: item.place,
    address,
    lat: item.lat,
    lng: item.lng,
    summary,
    description: buildDescription(item),
    heroImageUrl,
    startDate: item.startDate,
    endDate: item.endDate,
    source: "PUBLIC_API" as const,
    curationAvailable: false,
    reservable: false
  };

  const existing = await prisma.exhibition.findUnique({ where: { id } });
  if (existing) {
    await prisma.exhibition.update({ where: { id }, data: payload });
    result.updated += 1;
    return options.detailsUsed;
  }

  await prisma.exhibition.create({
    data: {
      id,
      ...payload,
      categories: JSON.stringify(mapCategories(item.realmName)),
      exhibitionType: "갤러리 초대전/기획전 전시",
      heroTone: "linear-gradient(135deg, #e8eef3 0%, #8fa4b8 50%, #3a4a5a 100%)",
      status: "PUBLISHED"
    }
  });
  result.imported += 1;
  return options.detailsUsed;
}

/**
 * 한눈에보는문화정보 → Exhibition 동기화
 * id 규칙: cultureinfo-{seq}
 *
 * 봄데이처럼 대량 전시 커버: serviceTp=A + 높은 maxPages + fastImageTrust
 */
export async function syncCultureInfoExhibitions(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const today = getTodayKST();
  const fromIso = options.fromDate ?? addDaysIso(today, -14);
  const toIso = options.toDate ?? addDaysIso(today, 120);
  const fromYmd = isoToYmd(fromIso);
  const toYmd = isoToYmd(toIso);

  const maxPages = options.maxPages ?? 200;
  const enrichDetails = options.enrichDetails ?? false;
  const detailLimit = options.detailLimit ?? 40;
  const activeOnly = options.activeOnly ?? true;
  const serviceTp = options.serviceTp ?? "A";
  const fastImageTrust = options.fastImageTrust ?? true;
  const keywords = options.keywords?.length ? options.keywords : [undefined];

  const result: SyncResult = {
    scanned: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    invalidImages: 0,
    detailsFetched: 0,
    pagesFetched: 0
  };

  const seen = new Set<string>();
  const detailState = {
    enrichDetails,
    detailsUsed: 0,
    detailLimit,
    fastImageTrust
  };

  for (const keyword of keywords) {
    for (let page = 1; page <= maxPages; page += 1) {
      const { items: pageItems, totalCount } = await fetchPeriodPage({
        pageNo: page,
        fromYmd,
        toYmd,
        keyword,
        serviceTp: keyword ? undefined : serviceTp
      });
      result.pagesFetched += 1;

      if (pageItems.length === 0) break;

      for (const base of pageItems) {
        result.scanned += 1;
        if (seen.has(base.seq)) {
          result.skipped += 1;
          continue;
        }
        seen.add(base.seq);

        if (!matchesPlaceFilter(base, options.placeIncludes)) {
          result.skipped += 1;
          continue;
        }

        if (activeOnly && !isActive(base, today)) {
          result.skipped += 1;
          continue;
        }

        detailState.detailsUsed = await upsertItem(base, detailState, result);
      }

      if (page * PAGE_SIZE >= totalCount) break;
    }
  }

  return result;
}

export async function syncSeoulMuseumOfArtExhibitions(
  options: Omit<SyncOptions, "keywords" | "placeIncludes" | "serviceTp"> = {}
) {
  return syncCultureInfoExhibitions({
    ...options,
    keywords: [
      "서울시립미술관",
      "SeMA",
      "서서울미술관",
      "북서울미술관",
      "남서울미술관",
      "난지미술창작스튜디오",
      "백남준기념관"
    ],
    placeIncludes: [
      "서울시립",
      "SeMA",
      "서서울",
      "북서울",
      "남서울",
      "난지",
      "백남준"
    ],
    activeOnly: options.activeOnly ?? true,
    maxPages: options.maxPages ?? 20,
    enrichDetails: options.enrichDetails ?? true,
    detailLimit: options.detailLimit ?? 40,
    fastImageTrust: options.fastImageTrust ?? true
  });
}
