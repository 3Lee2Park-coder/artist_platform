import { getTodayKST } from "@/lib/date";
import {
  defaultCoordsForRegion,
  enrichPublicLocation,
  resolvePublicExhibitionLocation
} from "@/lib/public-exhibition-location";
import {
  normalizePublicHeroImageUrl,
  stripHtml
} from "@/lib/public-exhibition-text";
import { prisma } from "@/lib/prisma";

const API_BASE =
  process.env.CULTURE_PUBLIC_API_URL?.trim() ||
  "https://api.kcisa.kr/openapi/API_CCA_145/request";

export type PublicExhibitionItem = {
  localId: string;
  title: string;
  institution: string;
  description: string;
  summary: string;
  heroImageUrl?: string;
  sourceUrl?: string;
  eventSite: string;
  spatialCoverage: string;
  genre: string;
  artist: string;
  startDate: string;
  endDate: string;
  charge?: string;
};

type SyncOptions = {
  maxPages?: number;
  rowsPerPage?: number;
  geocodeLimit?: number;
};

type SyncResult = {
  scanned: number;
  imported: number;
  updated: number;
  skipped: number;
  geocoded: number;
  invalidImages: number;
};

function getServiceKey() {
  const key = process.env.CULTURE_PUBLIC_API_KEY?.trim();
  if (!key) {
    throw new Error("CULTURE_PUBLIC_API_KEY 환경 변수가 설정되지 않았습니다.");
  }
  return key;
}

function parsePeriod(period: string | undefined) {
  if (!period?.includes("~")) {
    return null;
  }

  const [startRaw, endRaw] = period.split("~").map((part) => part.trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
    return null;
  }

  return { startDate: startRaw, endDate: endRaw };
}

function isActiveExhibition(item: PublicExhibitionItem, today = getTodayKST()) {
  return item.startDate <= today && item.endDate >= today;
}

function mapCategories(genre: string) {
  if (genre.includes("사진")) return ["사진"];
  if (genre.includes("조각")) return ["조각"];
  if (genre.includes("복합") || genre.includes("미디어")) return ["복합"];
  return ["회화"];
}

function buildDescription(item: PublicExhibitionItem) {
  return `${item.description}\n\n※ 문화체육관광부 공공데이터 기반 전시입니다.${
    item.charge ? `\n관람료: ${item.charge}` : ""
  }${item.sourceUrl ? `\n출처: ${item.sourceUrl}` : ""}`;
}

function parseXmlItems(xml: string): PublicExhibitionItem[] {
  const items: PublicExhibitionItem[] = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  for (const block of itemBlocks) {
    const read = (tag: string) => {
      const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return match?.[1]?.trim() ?? "";
    };

    const localId = read("LOCAL_ID");
    const title = read("TITLE");
    if (!localId || !title) {
      continue;
    }

    const period = parsePeriod(read("PERIOD"));
    if (!period) {
      continue;
    }

    const descriptionRaw = read("DESCRIPTION");
    const description = stripHtml(descriptionRaw);
    const summary = description.slice(0, 180) || title;
    const imageRaw = read("IMAGE_OBJECT");

    items.push({
      localId,
      title,
      institution: read("CNTC_INSTT_NM") || "문화시설",
      description,
      summary,
      heroImageUrl: imageRaw || undefined,
      sourceUrl: read("URL") || undefined,
      eventSite: read("EVENT_SITE") || "",
      spatialCoverage: read("SPATIAL_COVERAGE") || "",
      genre: read("GENRE") || "전시",
      artist: read("AUTHOR") || "기관 기획",
      startDate: period.startDate,
      endDate: period.endDate,
      charge: read("CHARGE") || undefined
    });
  }

  return items;
}

async function fetchPublicPage(pageNo: number, numOfRows: number) {
  const url = new URL(API_BASE);
  url.searchParams.set("serviceKey", getServiceKey());
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`공공 API 요청 실패 (${response.status})`);
  }

  const xml = await response.text();
  const resultCode = xml.match(/<resultCode>(.*?)<\/resultCode>/)?.[1];
  if (resultCode && resultCode !== "0000") {
    const msg = xml.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1] ?? "UNKNOWN";
    throw new Error(`공공 API 오류: ${resultCode} ${msg}`);
  }

  return parseXmlItems(xml);
}

async function resolveLocationForItem(
  item: PublicExhibitionItem,
  geocodeUsed: number,
  geocodeLimit: number
) {
  let location = resolvePublicExhibitionLocation({
    institution: item.institution,
    eventSite: item.eventSite,
    spatialCoverage: item.spatialCoverage
  });

  if (location.lat == null && geocodeUsed < geocodeLimit) {
    location = await enrichPublicLocation(location);
    if (location.lat != null) {
      geocodeUsed += 1;
    }
  }

  const fallback = defaultCoordsForRegion(location.region);
  const lat = location.lat ?? fallback.lat;
  const lng = location.lng ?? fallback.lng;

  return { location, lat, lng, geocodeUsed, didGeocode: location.lat != null };
}

export async function syncPublicExhibitions(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const maxPages = options.maxPages ?? 15;
  const rowsPerPage = options.rowsPerPage ?? 100;
  let geocodeLimit = options.geocodeLimit ?? 120;
  const today = getTodayKST();

  const result: SyncResult = {
    scanned: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    geocoded: 0,
    invalidImages: 0
  };

  const seenLocalIds = new Set<string>();
  let geocodeUsed = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageItems = await fetchPublicPage(page, rowsPerPage);
    if (pageItems.length === 0) {
      break;
    }

    for (const item of pageItems) {
      result.scanned += 1;

      if (seenLocalIds.has(item.localId)) {
        result.skipped += 1;
        continue;
      }
      seenLocalIds.add(item.localId);

      if (!isActiveExhibition(item, today)) {
        result.skipped += 1;
        continue;
      }

      const id = `public-${item.localId}`;
      const heroImageUrl = await normalizePublicHeroImageUrl(item.heroImageUrl);
      if (!heroImageUrl) {
        // 포스터 없는 전시는 UI가 엉성해지므로 신규 등록·업데이트 모두 건너뜀
        if (item.heroImageUrl) {
          result.invalidImages += 1;
        }
        result.skipped += 1;
        continue;
      }

      const { location, lat, lng, geocodeUsed: nextGeocodeUsed, didGeocode } =
        await resolveLocationForItem(item, geocodeUsed, geocodeLimit);
      geocodeUsed = nextGeocodeUsed;
      if (didGeocode) {
        result.geocoded += 1;
      }

      const payload = {
        title: item.title,
        artist: item.artist,
        region: location.region,
        district: location.district,
        venue: location.venue,
        address: location.address,
        lat,
        lng,
        summary: item.summary,
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
        await prisma.exhibition.update({
          where: { id },
          data: payload
        });
        result.updated += 1;
        continue;
      }

      await prisma.exhibition.create({
        data: {
          id,
          ...payload,
          categories: JSON.stringify(mapCategories(item.genre)),
          exhibitionType: "갤러리 초대전/기획전 전시",
          heroTone:
            "linear-gradient(135deg, #f3e7d3 0%, #c9a26a 50%, #5c4326 100%)",
          status: "PUBLISHED"
        }
      });
      result.imported += 1;
    }
  }

  return result;
}
