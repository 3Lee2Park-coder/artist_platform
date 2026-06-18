import type {
  Artwork,
  Exhibition,
  ExhibitionCategory,
  HeroTabKey
} from "@/types/exhibition";

export const CURRENT_DATE = "2026-06-18";

export const exhibitions: Exhibition[] = [
  {
    id: "seongsu-light",
    title: "빛의 잔상",
    artist: "윤서현",
    district: "성수",
    venue: "스튜디오 오브제",
    startDate: "2026-06-18",
    endDate: "2026-06-29",
    categories: ["회화", "복합"],
    exhibitionType: "개인 대관형 전시",
    curationAvailable: true,
    reservable: true,
    todayOpen: true,
    popular: true,
    nearby: true,
    heroTone: "linear-gradient(135deg, #efe6da 0%, #b8c5c0 48%, #4c4b45 100%)",
    summary:
      "도시의 빛이 남긴 잔상을 회화와 설치로 풀어낸 개인 대관형 전시입니다.",
    artistVideo: {
      id: "video-seongsu-light",
      title: "작가가 소개하는 빛의 잔상",
      duration: "00:58",
      posterTone: "linear-gradient(135deg, #ded6c9 0%, #6f7d7a 100%)",
      status: "ready"
    }
  },
  {
    id: "hannam-still",
    title: "고요한 표면",
    artist: "문하린",
    district: "한남",
    venue: "갤러리 페이지",
    startDate: "2026-06-14",
    endDate: "2026-07-03",
    categories: ["사진"],
    exhibitionType: "갤러리 초대전/기획전 전시",
    curationAvailable: true,
    reservable: true,
    popular: true,
    heroTone: "linear-gradient(135deg, #f0f1f3 0%, #c8ced8 48%, #545b65 100%)",
    summary:
      "일상의 사물을 낮은 채도로 포착한 사진 연작과 갤러리 큐레이션 노트를 함께 제공합니다.",
    artistVideo: {
      id: "video-hannam-still",
      title: "전시 설치 현장 스케치",
      duration: "01:00",
      posterTone: "linear-gradient(135deg, #dfe3e8 0%, #7f8792 100%)",
      status: "ready"
    }
  },
  {
    id: "hongdae-room",
    title: "방의 기록",
    artist: "이도겸",
    district: "홍대",
    venue: "플랫룸",
    startDate: "2026-06-17",
    endDate: "2026-06-25",
    categories: ["회화"],
    exhibitionType: "개인 대관형 전시",
    curationAvailable: false,
    reservable: true,
    nearby: true,
    heroTone: "linear-gradient(135deg, #f4e8df 0%, #d19f7d 52%, #7b4a37 100%)",
    summary:
      "작가가 머물렀던 방의 구조와 감각을 작은 캔버스에 기록한 회화 전시입니다."
  },
  {
    id: "samcheong-flow",
    title: "흐르는 좌표",
    artist: "정유민",
    district: "삼청",
    venue: "아트 스페이스 노드",
    startDate: "2026-06-12",
    endDate: "2026-06-30",
    categories: ["복합", "사진"],
    exhibitionType: "페어형 전시",
    curationAvailable: true,
    reservable: false,
    popular: true,
    heroTone: "linear-gradient(135deg, #e9edf2 0%, #acc0d1 46%, #334b63 100%)",
    summary:
      "사진, 사운드, 오브제를 통해 관람자의 이동 경로를 다시 구성하는 복합 전시입니다.",
    artistVideo: {
      id: "video-samcheong-flow",
      title: "공간을 따라 흐르는 좌표",
      duration: "00:46",
      posterTone: "linear-gradient(135deg, #c8d8e7 0%, #334b63 100%)",
      status: "ready"
    }
  },
  {
    id: "yeonnam-paper",
    title: "종이의 정원",
    artist: "박수아",
    district: "연남",
    venue: "라운드 하우스",
    startDate: "2026-06-18",
    endDate: "2026-06-24",
    categories: ["회화"],
    exhibitionType: "개인 대관형 전시",
    curationAvailable: false,
    reservable: true,
    todayOpen: true,
    heroTone: "linear-gradient(135deg, #fbf4e4 0%, #d8c68d 55%, #817044 100%)",
    summary:
      "종이 위에 겹겹이 쌓인 색과 질감을 정원처럼 걷는 작은 회화 전시입니다."
  },
  {
    id: "itaewon-afterimage",
    title: "밤의 여백",
    artist: "최리원",
    district: "이태원",
    venue: "스페이스 모노",
    startDate: "2026-06-10",
    endDate: "2026-06-22",
    categories: ["사진"],
    exhibitionType: "갤러리 초대전/기획전 전시",
    curationAvailable: true,
    reservable: true,
    heroTone: "linear-gradient(135deg, #1f2430 0%, #5f6573 50%, #e7e8eb 100%)",
    summary:
      "밤의 거리에서 남겨진 빛과 어둠의 여백을 기록한 사진 전시입니다."
  }
];

export const artworks: Artwork[] = [
  {
    id: "art-01",
    exhibitionId: "seongsu-light",
    title: "잔광 03",
    artist: "윤서현",
    material: "Oil on canvas",
    price: 780000,
    imageTone: "linear-gradient(135deg, #e9d6c6 0%, #b67c65 100%)"
  },
  {
    id: "art-02",
    exhibitionId: "hannam-still",
    title: "Still Surface 12",
    artist: "문하린",
    material: "Archival pigment print",
    price: 420000,
    imageTone: "linear-gradient(135deg, #eef0f1 0%, #8e99a6 100%)"
  },
  {
    id: "art-03",
    exhibitionId: "hongdae-room",
    title: "Room Note",
    artist: "이도겸",
    material: "Acrylic on linen",
    price: 560000,
    imageTone: "linear-gradient(135deg, #f7dfd1 0%, #b76445 100%)"
  },
  {
    id: "art-04",
    exhibitionId: "samcheong-flow",
    title: "Coordinate A",
    artist: "정유민",
    material: "Mixed media",
    imageTone: "linear-gradient(135deg, #d8e8ef 0%, #52778d 100%)"
  },
  {
    id: "art-05",
    exhibitionId: "yeonnam-paper",
    title: "Paper Garden 8",
    artist: "박수아",
    material: "Gouache on paper",
    price: 260000,
    imageTone: "linear-gradient(135deg, #fff2c8 0%, #b59b4c 100%)"
  },
  {
    id: "art-06",
    exhibitionId: "itaewon-afterimage",
    title: "Night Margin",
    artist: "최리원",
    material: "Photography",
    price: 360000,
    imageTone: "linear-gradient(135deg, #202632 0%, #b4bac3 100%)"
  }
];

const toDate = (date: string) => new Date(`${date}T00:00:00+09:00`);

export function getActiveExhibitions(today = CURRENT_DATE) {
  const current = toDate(today);

  return exhibitions.filter((exhibition) => {
    const startsAt = toDate(exhibition.startDate);
    const endsAt = toDate(exhibition.endDate);

    return startsAt <= current && endsAt >= current;
  });
}

export function getActiveCategories(today = CURRENT_DATE): ExhibitionCategory[] {
  const categorySet = new Set<ExhibitionCategory>();

  getActiveExhibitions(today).forEach((exhibition) => {
    exhibition.categories.forEach((category) => categorySet.add(category));
  });

  return Array.from(categorySet);
}

export function getHeroTabs(today = CURRENT_DATE): HeroTabKey[] {
  return ["today_open", "this_week", "nearby", ...getActiveCategories(today)];
}

export function getRepresentativeExhibition(tabKey: HeroTabKey): Exhibition {
  const activeExhibitions = getActiveExhibitions();
  const matched = activeExhibitions.find((exhibition) => {
    if (tabKey === "today_open") {
      return exhibition.todayOpen;
    }

    if (tabKey === "this_week") {
      return exhibition.popular;
    }

    if (tabKey === "nearby") {
      return exhibition.nearby;
    }

    return exhibition.categories.includes(tabKey);
  });

  return matched ?? activeExhibitions[0] ?? exhibitions[0];
}

export function getCategoryExhibitionGroups() {
  return getActiveCategories()
    .map((category) => ({
      category,
      title: `${category} 전시`,
      exhibitions: getActiveExhibitions().filter((exhibition) =>
        exhibition.categories.includes(category)
      )
    }))
    .filter((group) => group.exhibitions.length > 0);
}

export function getVideoExhibitions() {
  return getActiveExhibitions().filter(
    (exhibition) => exhibition.artistVideo?.status === "ready"
  );
}
