export type ExhibitionCategory = "회화" | "사진" | "조각" | "복합";

export type ExhibitionType =
  | "개인 대관형 전시"
  | "갤러리 초대전/기획전 전시"
  | "페어형 전시";

export type HeroTabKey =
  | "today_open"
  | "this_week"
  | "nearby"
  | ExhibitionCategory;

export type ArtistVideo = {
  id: string;
  title: string;
  duration: string;
  posterTone: string;
  status: "uploading" | "processing" | "ready" | "failed";
};

export type Exhibition = {
  id: string;
  title: string;
  artist: string;
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
  curationAvailable: boolean;
  reservable: boolean;
  todayOpen?: boolean;
  popular?: boolean;
  nearby?: boolean;
  heroTone: string;
  summary: string;
  description: string;
  reservationSlots: string[];
  artistVideo?: ArtistVideo;
};

export type Artwork = {
  id: string;
  exhibitionId: string;
  title: string;
  artist: string;
  material: string;
  price?: number;
  imageTone: string;
};