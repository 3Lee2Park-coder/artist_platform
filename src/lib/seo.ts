/** Per-page title/description helpers for Place · Curation · Exhibition. */

import { BRAND } from "@/lib/brand";
import { absoluteUrl } from "@/lib/site";

function clip(text: string, max = 155) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function withKind(name: string, location: string | null | undefined, kind: string) {
  const loc = location?.trim();
  return loc ? `${name} | ${loc} ${kind}` : `${name} | ${kind}`;
}

export function publicMeta(input: {
  title: string;
  description: string;
  canonical: string;
  images?: Array<string | null | undefined>;
}) {
  const images = (input.images ?? []).filter(
    (url): url is string => Boolean(url)
  );
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.canonical },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.canonical,
      locale: "ko_KR",
      siteName: `${BRAND.mark}(${BRAND.koreanAlias})`,
      ...(images.length > 0 ? { images } : {})
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
      "서울 가볼만한 곳 · 전시 근처 놀거리.",
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
      location ? `${location} 데이트·전시 코스.` : "서울 데이트·전시 코스.",
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
        `${input.district} 공방·쇼룸 ${input.name}. 서울 가볼만한 작가 공간.`
    )
  };
}

export function exhibitionJsonLd(input: {
  title: string;
  description: string;
  canonical: string;
  venue: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ExhibitionEvent",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.canonical),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    startDate: input.startDate,
    endDate: input.endDate,
    image: input.image || undefined,
    location: {
      "@type": "Place",
      name: input.venue,
      address: input.address || input.venue
    }
  };
}

export function placeJsonLd(input: {
  name: string;
  description: string;
  canonical: string;
  address: string;
  district: string;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.canonical),
    image: input.image || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: input.address,
      addressLocality: input.district,
      addressRegion: "서울",
      addressCountry: "KR"
    }
  };
}

export function curationJsonLd(input: {
  title: string;
  description: string;
  canonical: string;
  neighborhood?: string | null;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.canonical),
    image: input.image || undefined,
    about: input.neighborhood
      ? `${input.neighborhood} 데이트 코스`
      : "서울 전시 데이트 코스"
  };
}
