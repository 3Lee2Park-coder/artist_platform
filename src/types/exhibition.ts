export type ExhibitionCategory = "회화" | "사진" | "조각" | "복합";

export type ExhibitionType =
  | "개인 대관형 전시"
  | "갤러리 초대전/기획전 전시"
  | "페어형 전시";

export type HeroTabKey =
  | "today_open"
  | "this_week"
  | "upcoming"
  | "nearby"
  | ExhibitionCategory;

export type ArtistVideo = {
  id: string;
  title: string;
  duration: string;
  posterTone: string;
  videoUrl?: string;
  status: "uploading" | "processing" | "ready" | "failed";
};

// 데이터 출처 — 공공 API로 수집한 전시와 자체 발굴/등록 전시를 UI에서 구분
export type ExhibitionSource = "PUBLIC_API" | "ADMIN" | "ARTIST" | "USER_REPORT";

// 일정 기반으로 계산되는 전시 라이프사이클 상태
export type ExhibitionLifecycle =
  | "upcoming"
  | "ongoing"
  | "ending_soon"
  | "ended"
  | "extended"
  | "cancelled";

export type Exhibition = {
  id: string;
  title: string;
  artist: string;
  region: string;
  district: string;
  venue: string;
  address: string;
  mapPosition: {
    lat: number;
    lng: number;
  };
  startDate: string;
  endDate: string;
  categories: ExhibitionCategory[];
  exhibitionType: ExhibitionType;
  source: ExhibitionSource;
  lifecycle: ExhibitionLifecycle;
  curationAvailable: boolean;
  reservable: boolean;
  todayOpen?: boolean;
  popular?: boolean;
  nearby?: boolean;
  heroTone: string;
  heroImageUrl?: string;
  summary: string;
  description: string;
  descriptionImages: string[];
  /** @deprecated flat times — use reservationSchedule */
  reservationSlots: string[];
  /** 날짜별 대화 시간·정원 (레거시 슬롯은 date:null 로 정규화) */
  reservationSchedule: Array<{
    date: string | null;
    slots: Array<{ time: string; capacity: number }>;
  }>;
  artistVideo?: ArtistVideo;
  // 이 전시가 열리는 공방/쇼룸 (연결된 경우)
  space?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  // 로그인한 사용자의 상호작용 상태 (선택적)
  saved?: boolean;
  visited?: boolean;
};

export type Artwork = {
  id: string;
  exhibitionId: string;
  title: string;
  artist: string;
  material: string;
  price?: number;
  imageTone: string;
  imageUrl?: string;
};