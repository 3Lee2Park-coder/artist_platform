/** Per-page title/description helpers for Place · Curation · Exhibition. */

import { BRAND } from "@/lib/brand";
import { absoluteUrl, getSiteUrl, ogImage } from "@/lib/site";

function clip(text: string, max = 155) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function withKind(name: string, location: string | null | undefined, kind: string) {
  const loc = location?.trim();
  return loc ? `${name} | ${loc} ${kind}` : `${name} | ${kind}`;
}

export function entityKeywords(...extra: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const item of [...BRAND.seoKeywords, ...extra]) {
    const value = item?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    keywords.push(value);
  }
  return keywords;
}

function publisherNode() {
  const site = getSiteUrl();
  return {
    "@type": "Organization" as const,
    "@id": `${site}/#organization`,
    name: `${BRAND.mark}(${BRAND.koreanAlias})`,
    url: site
  };
}

function geoNode(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat === 0 && lng === 0) return undefined;
  return {
    "@type": "GeoCoordinates" as const,
    latitude: lat,
    longitude: lng
  };
}

function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  return {
    "@type": "BreadcrumbList" as const,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  const questions = items
    .map((item) => ({
      question: item.question.replace(/\s+/g, " ").trim(),
      answer: item.answer.replace(/\s+/g, " ").trim()
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 4);
  if (questions.length === 0) return null;
  return {
    "@type": "FAQPage" as const,
    mainEntity: questions.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: item.answer
      }
    }))
  };
}

function graph(nodes: Array<Record<string, unknown> | null | undefined>) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter((node): node is Record<string, unknown> => Boolean(node))
  };
}

/** 덱/큐레이션 공유 이미지: 커버 → 첫 스톱/전시 사진 → 기본 OG */
export function curationShareImages(curation: {
  coverImageUrl?: string | null;
  descriptionImages?: string[];
  stops?: Array<{ heroImageUrl?: string | null }>;
  exhibitions?: Array<{ heroImageUrl?: string | null }>;
  basePlace?: { imageUrl?: string | null } | null;
}) {
  return [
    curation.coverImageUrl,
    curation.stops?.find((stop) => stop.heroImageUrl)?.heroImageUrl,
    curation.exhibitions?.find((item) => item.heroImageUrl)?.heroImageUrl,
    curation.basePlace?.imageUrl,
    ...(curation.descriptionImages ?? [])
  ];
}

export function publicMeta(input: {
  title: string;
  description: string;
  canonical: string;
  images?: Array<string | null | undefined>;
  keywords?: string[];
}) {
  const images = (input.images ?? []).filter(
    (url): url is string => Boolean(url)
  );
  // 페이지가 openGraph를 정의하면 루트 이미지를 물려받지 못하므로 기본 커버로 채운다
  const ogImages = images.length > 0 ? images : [ogImage().url];
  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords?.length ? input.keywords : undefined,
    alternates: { canonical: input.canonical },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.canonical,
      locale: "ko_KR",
      siteName: `${BRAND.mark}(${BRAND.koreanAlias})`,
      images: ogImages
    },
    twitter: {
      card: "summary_large_image" as const,
      title: input.title,
      description: input.description,
      images: ogImages
    }
  };
}

export function exhibitionSeo(input: {
  title: string;
  artist: string;
  district: string;
  venue: string;
  summary: string;
  startDate?: string;
  endDate?: string;
}) {
  const location = input.district || input.venue;
  const period =
    input.startDate && input.endDate
      ? `${input.startDate}–${input.endDate}`
      : "";
  const description = clip(
    [
      location ? `${location}에서 열리는` : null,
      input.artist ? `${input.artist} 작가의` : null,
      `${input.title} 전시.`,
      period ? `${period}.` : null,
      `${BRAND.mark}(${BRAND.koreanAlias}) 전시 추천.`,
      input.summary
    ]
      .filter(Boolean)
      .join(" ")
  );

  return {
    title: withKind(input.title, location, "전시"),
    description
  };
}

export function placeSeo(input: {
  name: string;
  district: string;
  typeLabel: string;
  editorialNote?: string | null;
  notes?: string | null;
}) {
  const body = input.editorialNote || input.notes;
  const description = clip(
    [
      `${input.district} ${input.typeLabel} ${input.name}.`,
      `${BRAND.mark}(${BRAND.koreanAlias})가 고른 서울 가볼만한 곳 · 전시 근처 놀거리.`,
      body
    ]
      .filter(Boolean)
      .join(" ")
  );

  return {
    title: withKind(input.name, input.district, "가볼만한 곳"),
    description
  };
}

export function curationSeo(input: {
  title: string;
  neighborhood?: string | null;
  subtitle?: string | null;
  description?: string | null;
  durationText?: string | null;
}) {
  const location = input.neighborhood;
  const description = clip(
    [
      location
        ? `${BRAND.mark}(${BRAND.koreanAlias}) ${location} 데이트·전시 코스.`
        : `${BRAND.mark}(${BRAND.koreanAlias}) 서울 데이트·전시 코스.`,
      input.durationText ? `${input.durationText}.` : null,
      input.description || input.subtitle
    ]
      .filter(Boolean)
      .join(" ")
  );

  return {
    title: withKind(input.title, location, "데이트 코스"),
    description
  };
}

export function spaceSeo(input: {
  name: string;
  district: string;
  shortDescription?: string | null;
}) {
  return {
    title: withKind(input.name, input.district, "작가 공간"),
    description: clip(
      input.shortDescription ||
        `${input.district} 공방·쇼룸 ${input.name}. ${BRAND.mark}(${BRAND.koreanAlias}) 서울 가볼만한 작가 공간.`
    )
  };
}

export function exhibitionJsonLd(input: {
  title: string;
  description: string;
  canonical: string;
  venue: string;
  address?: string;
  district?: string;
  artist?: string;
  startDate?: string;
  endDate?: string;
  image?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  const url = absoluteUrl(input.canonical);
  const locationName = input.district || input.venue;
  return graph([
    {
      "@type": "ExhibitionEvent",
      name: input.title,
      description: input.description,
      url,
      inLanguage: "ko-KR",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      startDate: input.startDate,
      endDate: input.endDate,
      image: input.image || undefined,
      performer: input.artist
        ? { "@type": "Person", name: input.artist }
        : undefined,
      location: {
        "@type": "Place",
        name: input.venue,
        address: input.address || input.venue,
        geo: geoNode(input.lat, input.lng)
      },
      publisher: publisherNode(),
      isPartOf: { "@type": "WebSite", name: `${BRAND.mark}(${BRAND.koreanAlias})`, url: getSiteUrl() }
    },
    breadcrumbJsonLd([
      { name: `${BRAND.mark}(${BRAND.koreanAlias})`, path: "/" },
      { name: "전시", path: "/exhibitions" },
      { name: input.title, path: input.canonical }
    ]),
    faqJsonLd([
      {
        question: `${locationName}에서 지금 볼 전시 어디 있어?`,
        answer: `${BRAND.mark}(${BRAND.koreanAlias})에서 「${input.title}」전을 안내합니다. ${input.venue}${input.address ? `, ${input.address}` : ""}. 출처: ${url}`
      },
      input.artist
        ? {
            question: `${input.artist} 전시 어디서 봐?`,
            answer: `${input.artist} 작가의 「${input.title}」은 ${input.venue}에서 열립니다. ${BRAND.mark}(${BRAND.koreanAlias}) 전시 페이지: ${url}`
          }
        : { question: "", answer: "" }
    ])
  ]);
}

export function placeJsonLd(input: {
  name: string;
  description: string;
  canonical: string;
  address: string;
  district: string;
  typeLabel?: string;
  image?: string | null;
  lat?: number | null;
  lng?: number | null;
  sameAs?: string | null;
  nearbyExhibitions?: Array<{ title: string }>;
  curations?: Array<{ title: string }>;
}) {
  const url = absoluteUrl(input.canonical);
  const nearby = (input.nearbyExhibitions ?? [])
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 3);
  const courses = (input.curations ?? [])
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 3);
  const kind = input.typeLabel || "장소";

  return graph([
    {
      "@type": "Place",
      name: input.name,
      description: input.description,
      url,
      image: input.image || undefined,
      sameAs: input.sameAs || undefined,
      additionalType: kind,
      address: {
        "@type": "PostalAddress",
        streetAddress: input.address,
        addressLocality: input.district,
        addressRegion: "서울",
        addressCountry: "KR"
      },
      geo: geoNode(input.lat, input.lng),
      publisher: publisherNode(),
      isPartOf: { "@type": "WebSite", name: `${BRAND.mark}(${BRAND.koreanAlias})`, url: getSiteUrl() }
    },
    breadcrumbJsonLd([
      { name: `${BRAND.mark}(${BRAND.koreanAlias})`, path: "/" },
      { name: input.name, path: input.canonical }
    ]),
    faqJsonLd([
      {
        question: `${input.district} ${input.name} 어디에 있어?`,
        answer: `${input.district} ${kind} ${input.name}의 주소는 ${input.address}입니다. ${BRAND.mark}(${BRAND.koreanAlias})가 전시 곁 가볼만한 곳으로 소개합니다. 출처: ${url}`
      },
      nearby.length > 0
        ? {
            question: `${input.name} 근처 전시 어디 있어?`,
            answer: `${input.name} 근처 지금 볼 전시로는 ${nearby.join(", ")} 이 있습니다. ${BRAND.mark}(${BRAND.koreanAlias}) 장소 페이지: ${url}`
          }
        : courses.length > 0
          ? {
              question: `${input.district}에서 전시 보고 ${kind} 어디 가지?`,
              answer: `${BRAND.mark}(${BRAND.koreanAlias}) 코스 「${courses.join("」, 「")}」에 ${input.name}이 들어 있습니다. 출처: ${url}`
            }
          : {
              question: `${input.district} 전시 근처 ${kind} 추천`,
              answer: `${BRAND.mark}(${BRAND.koreanAlias})가 고른 ${input.district} ${kind} ${input.name}입니다. ${input.address}. 출처: ${url}`
            }
    ])
  ]);
}

export function curationJsonLd(input: {
  title: string;
  description: string;
  canonical: string;
  neighborhood?: string | null;
  image?: string | null;
  durationText?: string | null;
  stops?: Array<{
    stopType: string;
    title: string;
    refId?: string;
    href?: string | null;
    note?: string | null;
    address?: string | null;
    district?: string | null;
    lat?: number;
    lng?: number;
    categoryLabel?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    artist?: string | null;
  }>;
  cards?: Array<{
    sourceId: string;
    name: string;
    whyPicked?: string | null;
    oofNote?: string | null;
    href?: string | null;
  }>;
}) {
  const url = absoluteUrl(input.canonical);
  const area = input.neighborhood?.trim() || "서울";
  const cardNote = new Map(
    (input.cards ?? []).map((card) => [
      card.sourceId,
      card.whyPicked || card.oofNote || ""
    ])
  );
  const stops = (input.stops ?? []).slice(0, 20);
  const stopNames = stops.map((stop) => stop.title).filter(Boolean);

  const itemListElement = stops.map((stop, index) => {
    const itemUrl = stop.href ? absoluteUrl(stop.href) : undefined;
    const isExhibition = stop.stopType === "EXHIBITION";
    const description =
      clip(cardNote.get(stop.refId ?? "") || stop.note || "", 240) || undefined;
    const item = isExhibition
      ? {
          "@type": "ExhibitionEvent" as const,
          name: stop.title,
          description,
          url: itemUrl,
          startDate: stop.startDate || undefined,
          endDate: stop.endDate || undefined,
          performer: stop.artist
            ? { "@type": "Person" as const, name: stop.artist }
            : undefined,
          location: {
            "@type": "Place" as const,
            name: stop.district || stop.title,
            address: stop.address || undefined,
            geo: geoNode(stop.lat, stop.lng)
          }
        }
      : {
          "@type": "Place" as const,
          name: stop.title,
          description,
          url: itemUrl,
          additionalType: stop.categoryLabel || undefined,
          address: stop.address
            ? {
                "@type": "PostalAddress" as const,
                streetAddress: stop.address,
                addressLocality: stop.district || area,
                addressCountry: "KR"
              }
            : undefined,
          geo: geoNode(stop.lat, stop.lng)
        };

    return {
      "@type": "ListItem" as const,
      position: index + 1,
      name: stop.title,
      description,
      url: itemUrl,
      item
    };
  });

  return graph([
    {
      "@type": "ItemList",
      name: input.title,
      description: input.description,
      url,
      image: input.image || undefined,
      inLanguage: "ko-KR",
      numberOfItems: itemListElement.length || undefined,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: itemListElement.length > 0 ? itemListElement : undefined,
      about: `${area} 데이트 코스 · 전시 코스 · 가볼만한 곳`,
      keywords: [area, "전시 데이트", "데이트 코스", "가볼만한 곳", BRAND.mark, BRAND.koreanAlias]
        .filter(Boolean)
        .join(", "),
      publisher: publisherNode(),
      isPartOf: { "@type": "WebSite", name: `${BRAND.mark}(${BRAND.koreanAlias})`, url: getSiteUrl() }
    },
    breadcrumbJsonLd([
      { name: `${BRAND.mark}(${BRAND.koreanAlias})`, path: "/" },
      { name: "발견 코스", path: "/decks" },
      { name: input.title, path: input.canonical }
    ]),
    faqJsonLd([
      {
        question: `${area}에서 전시 보고 어디 가지?`,
        answer: `${BRAND.mark}(${BRAND.koreanAlias})의 「${input.title}」 코스를 참고하세요.${
          stopNames.length > 0 ? ` ${stopNames.join(", ")}이 한 코스에 묶여 있습니다.` : ""
        }${input.durationText ? ` ${input.durationText}.` : ""} 출처: ${url}`
      },
      stopNames.length > 0
        ? {
            question: `「${input.title}」 코스에는 어디가 들어 있어?`,
            answer: `${BRAND.mark}(${BRAND.koreanAlias})가 고른 순서는 ${stopNames.join(" → ")} 입니다. 서울 전시 데이트 코스 원문: ${url}`
          }
        : {
            question: `${area} 전시 데이트 코스 추천`,
            answer: `${BRAND.mark}(${BRAND.koreanAlias}) 「${input.title}」. ${input.description} 출처: ${url}`
          }
    ])
  ]);
}
