import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const exhibitions = [
  {
    id: "seongsu-light",
    title: "빛의 잔상",
    artist: "윤서현",
    district: "성수",
    venue: "스튜디오 오브제",
    address: "서울 성동구 연무장길 12",
    lat: 37.5447,
    lng: 127.0557,
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    categories: JSON.stringify(["회화", "복합"]),
    exhibitionType: "개인 대관형 전시",
    source: "ARTIST",
    curationAvailable: true,
    reservable: true,
    todayOpen: true,
    popular: true,
    nearby: true,
    heroTone: "linear-gradient(135deg, #efe6da 0%, #b8c5c0 48%, #4c4b45 100%)",
    summary:
      "도시의 빛이 남긴 잔상을 회화와 설치로 풀어낸, 조용히 감상하기 좋은 개인 대관형 전시입니다.",
    description:
      "성수동의 오래된 작업실을 임시 전시장으로 바꾸어, 낮과 밤의 빛이 벽면과 캔버스에 남기는 흔적을 따라가도록 구성했습니다.\n\n작가는 하루 동안 공간을 통과하는 자연광을 관찰하며, 빛이 사라진 자리에 남는 잔상을 회화의 주제로 삼았습니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify([
      {
        date: "2026-07-18",
        slots: [
          { time: "13:00", capacity: 8 },
          { time: "15:00", capacity: 8 },
          { time: "17:00", capacity: 6 }
        ]
      },
      {
        date: "2026-07-19",
        slots: [
          { time: "14:00", capacity: 10 },
          { time: "16:00", capacity: 10 }
        ]
      }
    ]),
    artistVideoTitle: "작가가 소개하는 빛의 잔상",
    artistVideoDuration: "00:58",
    artistVideoPosterTone: "linear-gradient(135deg, #ded6c9 0%, #6f7d7a 100%)",
    artistVideoStatus: "ready"
  },
  {
    id: "hannam-still",
    title: "고요한 표면",
    artist: "문하린",
    district: "한남",
    venue: "갤러리 페이지",
    address: "서울 용산구 이태원로 242",
    lat: 37.5367,
    lng: 127.0007,
    startDate: "2026-06-25",
    endDate: "2026-07-25",
    categories: JSON.stringify(["사진"]),
    exhibitionType: "갤러리 초대전/기획전 전시",
    source: "ADMIN",
    curationAvailable: true,
    reservable: true,
    popular: true,
    heroTone: "linear-gradient(135deg, #f0f1f3 0%, #c8ced8 48%, #545b65 100%)",
    summary:
      "일상의 사물을 낮은 채도로 포착한 사진 연작과 갤러리 큐레이션 노트를 함께 제공합니다.",
    description:
      "갤러리 페이지의 기획전으로, 작가는 사물의 표면에 남은 빛과 먼지, 사용의 흔적을 사진으로 기록했습니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify([
      {
        date: "2026-07-20",
        slots: [
          { time: "12:00", capacity: 6 },
          { time: "14:00", capacity: 6 },
          { time: "16:00", capacity: 6 }
        ]
      }
    ]),
    artistVideoTitle: "전시 설치 현장 스케치",
    artistVideoDuration: "01:00",
    artistVideoPosterTone: "linear-gradient(135deg, #dfe3e8 0%, #7f8792 100%)",
    artistVideoStatus: "ready"
  },
  {
    id: "hongdae-room",
    title: "방의 기록",
    artist: "이도겸",
    district: "홍대",
    venue: "플랫룸",
    address: "서울 마포구 와우산로 29길 8",
    lat: 37.5549,
    lng: 126.9237,
    startDate: "2026-07-03",
    endDate: "2026-07-20",
    categories: JSON.stringify(["회화"]),
    exhibitionType: "개인 대관형 전시",
    source: "USER_REPORT",
    curationAvailable: false,
    reservable: true,
    todayOpen: true,
    nearby: true,
    heroTone: "linear-gradient(135deg, #f4e8df 0%, #d19f7d 52%, #7b4a37 100%)",
    summary:
      "작가가 머물렀던 방의 구조와 감각을 작은 캔버스에 기록한 회화 전시입니다.",
    description:
      "작가는 방 안에서 반복적으로 마주한 모서리, 창문, 테이블의 그림자를 작은 캔버스에 옮겼습니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify(["11:00", "14:00", "17:00"])
  },
  {
    id: "samcheong-flow",
    title: "흐르는 좌표",
    artist: "정유민",
    district: "삼청",
    venue: "아트 스페이스 노드",
    address: "서울 종로구 삼청로 84",
    lat: 37.5835,
    lng: 126.9819,
    startDate: "2026-06-20",
    endDate: "2026-07-30",
    categories: JSON.stringify(["복합", "사진"]),
    exhibitionType: "페어형 전시",
    source: "ADMIN",
    curationAvailable: true,
    reservable: false,
    popular: true,
    heroTone: "linear-gradient(135deg, #e9edf2 0%, #acc0d1 46%, #334b63 100%)",
    summary:
      "사진, 사운드, 오브제를 통해 관람자의 이동 경로를 다시 구성하는 복합 전시입니다.",
    description:
      "페어형 전시의 일부로 구성된 이 프로젝트는 관람자의 위치와 동선을 작품 감상의 일부로 다룹니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify([]),
    artistVideoTitle: "공간을 따라 흐르는 좌표",
    artistVideoDuration: "00:46",
    artistVideoPosterTone: "linear-gradient(135deg, #c8d8e7 0%, #334b63 100%)",
    artistVideoStatus: "ready"
  },
  {
    id: "yeonnam-paper",
    title: "종이의 정원",
    artist: "박수아",
    district: "연남",
    venue: "라운드 하우스",
    address: "서울 마포구 동교로 38길 16",
    lat: 37.5624,
    lng: 126.9257,
    startDate: "2026-07-04",
    endDate: "2026-07-28",
    categories: JSON.stringify(["회화"]),
    exhibitionType: "개인 대관형 전시",
    source: "ARTIST",
    curationAvailable: false,
    reservable: true,
    todayOpen: true,
    heroTone: "linear-gradient(135deg, #fbf4e4 0%, #d8c68d 55%, #817044 100%)",
    summary:
      "종이 위에 겹겹이 쌓인 색과 질감을 정원처럼 걷는 작은 회화 전시입니다.",
    description:
      "작가는 종이 위에 얇은 색을 여러 번 쌓고 지우며 작은 정원의 풍경을 만듭니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify(["13:30", "15:30", "17:30"])
  },
  {
    id: "itaewon-afterimage",
    title: "밤의 여백",
    artist: "최리원",
    district: "이태원",
    venue: "스페이스 모노",
    address: "서울 용산구 녹사평대로 168",
    lat: 37.5345,
    lng: 126.9906,
    startDate: "2026-06-28",
    endDate: "2026-07-09",
    categories: JSON.stringify(["사진"]),
    exhibitionType: "갤러리 초대전/기획전 전시",
    source: "ADMIN",
    curationAvailable: true,
    reservable: true,
    heroTone: "linear-gradient(135deg, #1f2430 0%, #5f6573 50%, #e7e8eb 100%)",
    summary:
      "밤의 거리에서 남겨진 빛과 어둠의 여백을 기록한 사진 전시입니다.",
    description:
      "이태원 일대의 밤 풍경을 기록한 사진 전시입니다. 강한 조명보다 빛이 닿지 않은 주변부를 중심으로 구성했습니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify(["14:00", "16:00", "20:00"])
  },
  {
    id: "sejong-impressionism",
    title: "인상주의를 넘어: 르누아르, 드가, 고흐",
    artist: "디트로이트 미술관 소장품",
    district: "광화문",
    venue: "세종문화회관 미술관",
    address: "서울 종로구 세종대로 175",
    lat: 37.5726,
    lng: 126.976,
    startDate: "2026-05-28",
    endDate: "2026-08-23",
    categories: JSON.stringify(["회화", "복합"]),
    exhibitionType: "갤러리 초대전/기획전 전시",
    source: "PUBLIC_API",
    curationAvailable: false,
    reservable: false,
    popular: true,
    heroTone: "linear-gradient(135deg, #f3e7d3 0%, #c9a26a 50%, #5c4326 100%)",
    summary:
      "디트로이트 미술관이 선보이는 세계 명작 52점, 사실주의에서 입체주의까지 100년의 예술을 한 자리에서.",
    description:
      "미국 디트로이트 미술관이 선보이는 '인상주의를 넘어' 전시가 세종미술관에서 열립니다. 인상주의에서 시작해 야수파, 입체파에 이르는 대표작을 만날 수 있습니다.\n\n※ 공공 전시 정보 기반으로 제공되는 전시입니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify([])
  },
  {
    id: "ddp-media-wave",
    title: "미디어 웨이브: 빛과 데이터",
    artist: "국립현대미술관 협력전",
    district: "동대문",
    venue: "DDP 디자인랩",
    address: "서울 중구 을지로 281",
    lat: 37.5674,
    lng: 127.0096,
    startDate: "2026-06-15",
    endDate: "2026-07-10",
    categories: JSON.stringify(["복합"]),
    exhibitionType: "갤러리 초대전/기획전 전시",
    source: "PUBLIC_API",
    curationAvailable: false,
    reservable: false,
    nearby: true,
    heroTone: "linear-gradient(135deg, #1a1e2e 0%, #3b5bdb 55%, #d0ebff 100%)",
    summary:
      "데이터와 빛으로 구현한 대규모 미디어아트. 공공 문화데이터 기반으로 수집된 전시입니다.",
    description:
      "관람객의 움직임에 반응하는 대형 미디어 설치 작업을 선보입니다.\n\n※ 공공 전시 정보 기반으로 제공되는 전시입니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify([])
  },
  {
    id: "matinkim-new-words",
    title: "NEW WORDS, NEW WORTH",
    artist: "마뗑킴 × 글로벌 아티스트",
    district: "성수",
    venue: "마뗑킴 성수 플래그십",
    address: "서울 성동구 연무장3길 9",
    lat: 37.5442,
    lng: 127.0542,
    startDate: "2026-06-25",
    endDate: "2026-07-23",
    categories: JSON.stringify(["복합", "사진"]),
    exhibitionType: "갤러리 초대전/기획전 전시",
    source: "ADMIN",
    curationAvailable: true,
    reservable: false,
    popular: true,
    nearby: true,
    heroTone: "linear-gradient(135deg, #f4efe8 0%, #2a2a2a 55%, #c8a98a 100%)",
    summary:
      "패션×아트 팝업. 연무장 핵심에서 사진 찍기 좋은 감각적 전시입니다.",
    description:
      "마뗑킴과 글로벌 아티스트들이 함께한 첫 번째 기록 전시입니다. 성수 플래그십에서 브랜드의 새로운 가치를 시각적으로 풀어냅니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify([])
  },
  {
    id: "kimetsu-total-concentration",
    title: "귀멸의 칼날: 전집중展",
    artist: "귀멸의 칼날 공식 투어",
    district: "성수",
    venue: "에스팩토리 D동",
    address: "서울 성동구 연무장15길 11",
    lat: 37.5436,
    lng: 127.0568,
    startDate: "2026-06-27",
    endDate: "2026-09-27",
    categories: JSON.stringify(["복합"]),
    exhibitionType: "페어형 전시",
    source: "ADMIN",
    curationAvailable: true,
    reservable: false,
    popular: true,
    nearby: true,
    heroTone: "linear-gradient(135deg, #1a1520 0%, #6b2d3a 50%, #e8c4a0 100%)",
    summary:
      "애니메이션 세계관을 재현한 몰입형 대형 전시. 1~2시간 잡고 가기 좋습니다.",
    description:
      "귀멸의 칼날 세계관을 구현한 몰입형 전시입니다. 명장면 재현, 원화, 체험형 콘텐츠로 구성되어 있습니다.",
    descriptionImages: JSON.stringify([]),
    reservationSlots: JSON.stringify([])
  }
];

// 신당창작아케이드 검증용 DEMO 데이터 — 실제 작가/공방 정보가 아니며, 실측 후 교체해야 한다
const demoSindangExhibition = {
  id: "sindang-demo-hands",
  title: "머무는 손 (DEMO)",
  artist: "데모 작가",
  district: "신당",
  venue: "신당 공방 A (DEMO)",
  address: "서울 중구 퇴계로 431 일대 (DEMO 위치)",
  lat: 37.5659,
  lng: 127.0182,
  startDate: "2026-07-15",
  endDate: "2026-08-31",
  categories: JSON.stringify(["복합"]),
  exhibitionType: "개인 대관형 전시",
  source: "ARTIST",
  curationAvailable: true,
  reservable: false,
  todayOpen: true,
  heroTone: "linear-gradient(135deg, #f3ece2 0%, #c9a988 52%, #6b503c 100%)",
  summary:
    "(DEMO) 공방에서 만들어지는 공예 오브제의 과정을 소개하는 작은 전시입니다. 실제 전시 데이터로 교체가 필요합니다.",
  description:
    "(DEMO 데이터) 신당창작아케이드 공방에서 진행되는 상시 전시 예시입니다.\n\n실제 작가 동의와 정보 확인 후 이 데이터를 교체해주세요.",
  descriptionImages: JSON.stringify([]),
  reservationSlots: JSON.stringify([])
};

const demoSpaces = [
  {
    id: "space-sindang-demo-a",
    slug: "sindang-demo-studio-a",
    name: "신당 공방 A (DEMO)",
    type: "STUDIO",
    region: "서울",
    district: "신당",
    address: "서울 중구 퇴계로 431 일대 (DEMO 위치)",
    lat: 37.5659,
    lng: 127.0182,
    floorOrUnit: "지하 1층 (DEMO)",
    shortDescription: "(DEMO) 나무의 결을 따라 일상 오브제를 만드는 공방",
    description:
      "(DEMO 데이터) 신당창작아케이드 입주 공방 예시입니다. 실제 작가 동의 후 공방 소개로 교체해주세요.",
    heroTone: "linear-gradient(135deg, #efe6da 0%, #b8a68e 55%, #5c4a3a 100%)",
    visitPolicy: "HOURS",
    visitNotice: "(DEMO) 작업 중에는 조용히 둘러봐 주세요.",
    openingHours: JSON.stringify({
      tue: "11:00-18:00",
      wed: "11:00-18:00",
      thu: "11:00-18:00",
      fri: "11:00-18:00",
      sat: "11:00-18:00",
      sun: "11:00-18:00"
    }),
    sortOrder: 0
  },
  {
    id: "space-sindang-demo-b",
    slug: "sindang-demo-showroom-b",
    name: "신당 쇼룸 B (DEMO)",
    type: "SHOWROOM",
    region: "서울",
    district: "신당",
    address: "서울 중구 퇴계로 431 일대 (DEMO 위치)",
    lat: 37.5657,
    lng: 127.0176,
    floorOrUnit: "지하 1층 (DEMO)",
    shortDescription: "(DEMO) 금속과 돌을 다루는 장신구 쇼룸",
    description:
      "(DEMO 데이터) 예약자 우선으로 운영되는 쇼룸 예시입니다. 실제 정보로 교체해주세요.",
    heroTone: "linear-gradient(135deg, #e8e6ef 0%, #9a94b8 55%, #423d5c 100%)",
    visitPolicy: "APPOINTMENT",
    visitNotice: "(DEMO) 방문 전 인스타그램 DM으로 연락을 권장합니다.",
    openingHours: JSON.stringify({}),
    sortOrder: 1
  },
  {
    id: "space-sindang-demo-c",
    slug: "sindang-demo-residency-c",
    name: "신당 레지던시 C (DEMO)",
    type: "RESIDENCY",
    region: "서울",
    district: "신당",
    address: "서울 중구 퇴계로 431 일대 (DEMO 위치)",
    lat: 37.5655,
    lng: 127.0189,
    floorOrUnit: "지하 1층 (DEMO)",
    shortDescription: "(DEMO) 도자 작업 과정을 프로그램으로만 공개하는 공방",
    description:
      "(DEMO 데이터) 프로그램 시간에만 방문할 수 있는 공방 예시입니다. 실제 정보로 교체해주세요.",
    heroTone: "linear-gradient(135deg, #e2ede8 0%, #8fb8a5 55%, #3d5c4e 100%)",
    visitPolicy: "PROGRAM_ONLY",
    visitNotice: "(DEMO) 오픈 스튜디오 예약자만 입장할 수 있습니다.",
    openingHours: JSON.stringify({}),
    sortOrder: 2
  }
];

const demoProgram = {
  id: "program-sindang-demo-open",
  slug: "sindang-demo-open-studio",
  title: "오픈 스튜디오 — 신당 공방 A (DEMO)",
  type: "OPEN_STUDIO",
  spaceId: "space-sindang-demo-a",
  summary:
    "(DEMO) 작가와 함께 공방을 둘러보고 작업 과정을 듣는 30분 프로그램입니다.",
  description:
    "(DEMO 데이터) 오픈 스튜디오 프로그램 예시입니다. 실제 작가 동의 후 일정과 내용을 교체해주세요.",
  heroTone: "linear-gradient(135deg, #f2e8dc 0%, #c9a26a 55%, #5c4326 100%)",
  startDate: "2026-08-08",
  endDate: "2026-08-22",
  reservationSlots: JSON.stringify([
    {
      date: "2026-08-08",
      slots: [
        { time: "14:00", capacity: 6 },
        { time: "16:00", capacity: 6 }
      ]
    },
    {
      date: "2026-08-15",
      slots: [
        { time: "14:00", capacity: 6 },
        { time: "16:00", capacity: 6 }
      ]
    },
    {
      date: "2026-08-22",
      slots: [{ time: "14:00", capacity: 8 }]
    }
  ]),
  reservationRequired: true,
  policyNote:
    "(DEMO) 시작 24시간 전까지 취소할 수 있습니다. 공방 사정으로 일정이 변경될 수 있습니다."
};

const demoSindangPlace = {
  id: "place-sindang-demo-cafe",
  name: "신당 카페 (DEMO)",
  type: "CAFE",
  region: "서울",
  district: "신당",
  address: "서울 중구 퇴계로 인근 (DEMO 위치)",
  lat: 37.5664,
  lng: 127.017,
  tags: JSON.stringify(["휴식", "대화"]),
  sourceUrl: `https://map.naver.com/p/search/${encodeURIComponent("신당역 카페")}`,
  notes: "(DEMO) 공방 관람 뒤 쉬어가기 좋은 자리 — 실제 답사 후 교체",
  isActive: true,
  usedCount: 0,
  lastUsedAt: null
};

const artworks = [
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
    price: null,
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

const curationTags = [
  "사진 찍기 좋은 전시",
  "비 오는 날 추천",
  "퇴근 후 관람",
  "데이트 추천"
];

const seongsuCourseDescription = `성수 연무장에서 어디부터 갈지 고민될 때 쓰는 코스입니다.
검증해 둔 카페를 거점으로, 걸어서 갈 수 있는 전시를 골라 두었습니다.

거점
로우키 성수점 (서울 성동구 연무장3길 6)
— 대화하기 좋은 커피, 오후에 잠깐 쉬기 좋은 자리
좌표: 37.5443, 127.0540
https://map.naver.com/p/search/${encodeURIComponent("로우키 성수점")}

이 반경 안 전시
원하는 곳만 골라 가세요. 메인/사이드 없이 동등한 추천입니다.

추천 흐름
로우키에서 커피
가까운 전시 1~2곳
여유 있으면 대형 전시나 연무장길·서울숲 산책

팁
NEW WORDS, NEW WORTH는 7/23 마감. 주말 오후는 로우키·연무장길이 붐빌 수 있어 이른 오후가 편합니다.`;

const places = [
  {
    id: "place-lowkey-seongsu",
    name: "로우키 성수점",
    type: "CAFE",
    region: "서울",
    district: "성수",
    address: "서울 성동구 연무장3길 6",
    lat: 37.5443,
    lng: 127.054,
    tags: JSON.stringify(["데이트", "조용", "오후"]),
    sourceUrl: `https://map.naver.com/p/search/${encodeURIComponent("로우키 성수점")}`,
    notes: "대화하기 좋은 커피, 오후에 잠깐 쉬기 좋은 자리",
    isActive: true,
    usedCount: 1,
    lastUsedAt: new Date()
  },
  {
    id: "place-yeonmujang-cafe",
    name: "카페 연무장",
    type: "CAFE",
    region: "서울",
    district: "성수",
    address: "서울 성동구 연무장길 36",
    lat: 37.5448,
    lng: 127.0552,
    tags: JSON.stringify(["데이트", "사진", "루프탑"]),
    sourceUrl: `https://map.naver.com/p/search/${encodeURIComponent("카페 연무장")}`,
    notes: "루프탑 뷰, 다음 주 거점 후보",
    isActive: true,
    usedCount: 0,
    lastUsedAt: null
  },
  {
    id: "place-seoulforest-walk",
    name: "연무장길–서울숲 산책",
    type: "WALK",
    region: "서울",
    district: "성수",
    address: "서울 성동구 성수동1가 일대",
    lat: 37.5446,
    lng: 127.041,
    tags: JSON.stringify(["산책", "데이트"]),
    sourceUrl: `https://map.naver.com/p/search/${encodeURIComponent("서울숲")}`,
    notes: "전시 사이 짧게 걷기 좋은 루프",
    isActive: true,
    usedCount: 0,
    lastUsedAt: null
  }
];

type SeedCuration = {
  title: string;
  subtitle: string;
  description: string;
  coverTone: string;
  sortOrder: number;
  neighborhood?: string;
  situationTags?: string[];
  basePlaceId?: string;
  radiusMeters?: number;
  durationText?: string;
  exhibitions: Array<{
    exhibitionId: string;
    editorialBadge?: string | null;
    distanceText?: string | null;
  }>;
};

const curations: SeedCuration[] = [
  {
    title: "성수 오후, 로우키에서 시작하는 연무장 전시 둘러보기",
    subtitle: "성수 · 로우키 거점 · 도보 10분 · 전시 3곳 · 약 2~3시간",
    description: seongsuCourseDescription,
    coverTone: "linear-gradient(135deg, #f5efe8 0%, #c4a882 45%, #5c4a3a 100%)",
    sortOrder: 0,
    neighborhood: "성수",
    situationTags: ["데이트", "오후"],
    basePlaceId: "place-lowkey-seongsu",
    radiusMeters: 800,
    durationText: "2~3시간",
    exhibitions: [
      {
        exhibitionId: "matinkim-new-words",
        editorialBadge: "가장 가까움|사진",
        distanceText: "도보 2분"
      },
      {
        exhibitionId: "seongsu-light",
        editorialBadge: "조용함|예약 가능",
        distanceText: "도보 4분"
      },
      {
        exhibitionId: "kimetsu-total-concentration",
        editorialBadge: "몰입형",
        distanceText: "도보 8~10분"
      }
    ]
  },
  {
    title: "비 오는 주말, 데이트하기 좋은 전시",
    subtitle: "차분한 분위기의 실내 전시 모음",
    description:
      "비 오는 날 우산을 쓰고 천천히 걷기 좋은, 조도 낮은 실내 전시를 골랐습니다.",
    coverTone: "linear-gradient(135deg, #2b3a4a 0%, #6b8299 60%, #cfd9e0 100%)",
    sortOrder: 1,
    situationTags: ["데이트", "비오는날"],
    exhibitions: [
      { exhibitionId: "hannam-still" },
      { exhibitionId: "itaewon-afterimage" },
      { exhibitionId: "samcheong-flow" },
      { exhibitionId: "yeonnam-paper" }
    ]
  },
  {
    title: "사진 찍기 좋은 전시",
    subtitle: "인스타그램에 담고 싶은 공간",
    description: "빛과 색이 살아있어 사진으로 남기기 좋은 전시들입니다.",
    coverTone: "linear-gradient(135deg, #ffd9c0 0%, #ff8f6b 60%, #b64a37 100%)",
    sortOrder: 2,
    situationTags: ["사진"],
    exhibitions: [
      { exhibitionId: "seongsu-light" },
      { exhibitionId: "yeonnam-paper" },
      { exhibitionId: "hongdae-room" }
    ]
  },
  {
    title: "퇴근 후 가볍게 보기 좋은 전시",
    subtitle: "저녁 예약이 가능한 도심 전시",
    description: "늦은 시간 예약이 가능해 퇴근 후 들르기 좋은 전시입니다.",
    coverTone: "linear-gradient(135deg, #1f2430 0%, #4c5673 55%, #e7e8eb 100%)",
    sortOrder: 3,
    situationTags: ["퇴근후"],
    exhibitions: [
      { exhibitionId: "seongsu-light" },
      { exhibitionId: "itaewon-afterimage" },
      { exhibitionId: "hongdae-room" }
    ]
  }
];

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const artistUser = await prisma.user.upsert({
    where: { email: "artist@exhibit.kr" },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: "artist@exhibit.kr",
      passwordHash,
      name: "윤서현",
      role: "ARTIST",
      artistStatus: "APPROVED",
      interestTags: JSON.stringify(["회화", "현대미술"]),
      visitPurposes: JSON.stringify(["감상·몰입", "영감·레퍼런스"]),
      onboardedAt: new Date(),
      emailVerifiedAt: new Date()
    }
  });

  const memberUser = await prisma.user.upsert({
    where: { email: "member@exhibit.kr" },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: "member@exhibit.kr",
      passwordHash,
      name: "김관람",
      role: "MEMBER",
      artistStatus: "NONE",
      interestTags: JSON.stringify(["사진", "회화", "미디어아트"]),
      visitPurposes: JSON.stringify(["데이트", "사진 촬영"]),
      onboardedAt: new Date(),
      emailVerifiedAt: new Date()
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@exhibit.kr" },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: "admin@exhibit.kr",
      passwordHash,
      name: "운영자",
      role: "ADMIN",
      artistStatus: "APPROVED",
      onboardedAt: new Date(),
      emailVerifiedAt: new Date()
    }
  });

  // 데모 작가 공개 프로필 (DEMO)
  await prisma.artistApplication.upsert({
    where: { userId: artistUser.id },
    update: {
      status: "APPROVED",
      discipline: "회화 · 설치 (DEMO)",
      instagramUrl: "https://instagram.com/demo_artist",
      bio: "(DEMO) 빛과 공간을 주제로 작업하는 작가입니다. 실제 소개로 교체해주세요."
    },
    create: {
      userId: artistUser.id,
      bio: "(DEMO) 빛과 공간을 주제로 작업하는 작가입니다. 실제 소개로 교체해주세요.",
      status: "APPROVED",
      discipline: "회화 · 설치 (DEMO)",
      instagramUrl: "https://instagram.com/demo_artist",
      activityArea: "서울 신당·성수"
    }
  });

  for (const exhibition of exhibitions) {
    const registeredById =
      exhibition.source === "ARTIST" ? artistUser.id : adminUser.id;

    await prisma.exhibition.upsert({
      where: { id: exhibition.id },
      update: { ...exhibition, registeredById },
      create: { ...exhibition, registeredById }
    });
  }

  // 신당 DEMO 공간 (공방/쇼룸/레지던시)
  for (const [index, space] of demoSpaces.entries()) {
    const ownerUserId = index === 0 ? artistUser.id : null;
    await prisma.space.upsert({
      where: { id: space.id },
      update: { ...space, ownerUserId },
      create: { ...space, ownerUserId }
    });
  }

  // 신당 DEMO 전시 — 공방 A에서 열리는 상시 전시 예시
  await prisma.exhibition.upsert({
    where: { id: demoSindangExhibition.id },
    update: {
      ...demoSindangExhibition,
      registeredById: artistUser.id,
      spaceId: "space-sindang-demo-a"
    },
    create: {
      ...demoSindangExhibition,
      registeredById: artistUser.id,
      spaceId: "space-sindang-demo-a"
    }
  });

  // 신당 DEMO 프로그램 (오픈 스튜디오)
  await prisma.program.upsert({
    where: { id: demoProgram.id },
    update: { ...demoProgram, hostUserId: artistUser.id },
    create: { ...demoProgram, hostUserId: artistUser.id }
  });

  // 신당 DEMO 주변 장소
  await prisma.place.upsert({
    where: { id: demoSindangPlace.id },
    update: demoSindangPlace,
    create: demoSindangPlace
  });

  for (const artwork of artworks) {
    await prisma.artwork.upsert({
      where: { id: artwork.id },
      update: artwork,
      create: artwork
    });
  }

  // 큐레이션 태그
  for (const name of curationTags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, type: "CURATION" }
    });
  }

  // Place Pool
  for (const place of places) {
    await prisma.place.upsert({
      where: { id: place.id },
      update: place,
      create: place
    });
  }

  // 큐레이션 컬렉션 (관리자 생성) — 재실행 시 중복 방지 위해 초기화 후 재생성
  await prisma.curationStop.deleteMany();
  await prisma.curationExhibition.deleteMany();
  await prisma.curation.deleteMany();

  // 신당창작아케이드 첫 큐레이션 (DEMO) — 공간 + 전시 + 주변 장소를 하나의 동선으로
  const sindangCuration = await prisma.curation.create({
    data: {
      title: "신당창작아케이드를 처음 만나는 90분 (DEMO)",
      subtitle: "신당 · 공방 2곳 + 쇼룸 1곳 · 걸어서 이어지는 동선",
      description:
        "(DEMO 데이터) 신당역 지하에 이어진 공방들을 처음 방문하는 사람을 위한 코스 예시입니다.\n실제 답사와 작가 동의 후 내용을 교체해주세요.",
      coverTone: "linear-gradient(135deg, #f3ece2 0%, #c9a988 45%, #4a3b2e 100%)",
      sortOrder: 0,
      neighborhood: "신당",
      situationTags: JSON.stringify(["주말", "천천히", "공예"]),
      radiusMeters: 500,
      durationText: "약 90분",
      createdById: adminUser.id
    }
  });

  await prisma.curationStop.createMany({
    data: [
      {
        curationId: sindangCuration.id,
        sortOrder: 0,
        stopType: "SPACE",
        spaceId: "space-sindang-demo-a",
        editorialBadge: "오늘 열려 있음",
        distanceText: "입구에서 도보 1분",
        note: "(DEMO) 나무 오브제가 만들어지는 과정부터 보세요."
      },
      {
        curationId: sindangCuration.id,
        sortOrder: 1,
        stopType: "EXHIBITION",
        exhibitionId: "sindang-demo-hands",
        editorialBadge: "공방 안 전시",
        distanceText: "같은 공간",
        note: "(DEMO) 공방 A에서 이어지는 작은 전시입니다."
      },
      {
        curationId: sindangCuration.id,
        sortOrder: 2,
        stopType: "SPACE",
        spaceId: "space-sindang-demo-b",
        editorialBadge: "예약자 우선",
        distanceText: "도보 2분",
        note: "(DEMO) 장신구 쇼룸 — 방문 전 연락을 권장합니다."
      },
      {
        curationId: sindangCuration.id,
        sortOrder: 3,
        stopType: "PLACE",
        placeId: "place-sindang-demo-cafe",
        editorialBadge: "쉬어가기",
        distanceText: "도보 4분",
        note: "(DEMO) 관람 후 이야기 나누기 좋은 자리입니다."
      }
    ]
  });

  // 하위 호환 — 전시형 stop은 CurationExhibition에도 반영
  await prisma.curationExhibition.create({
    data: {
      curationId: sindangCuration.id,
      exhibitionId: "sindang-demo-hands",
      sortOrder: 0,
      editorialBadge: "공방 안 전시",
      distanceText: "같은 공간"
    }
  });

  for (const [index, curation] of curations.entries()) {
    const { exhibitions: links, situationTags, ...rest } = curation;
    const created = await prisma.curation.create({
      data: {
        ...rest,
        sortOrder: index + 1,
        situationTags: JSON.stringify(situationTags ?? []),
        createdById: adminUser.id
      }
    });

    await prisma.curationExhibition.createMany({
      data: links.map((link, linkIndex) => ({
        curationId: created.id,
        exhibitionId: link.exhibitionId,
        sortOrder: linkIndex,
        editorialBadge: link.editorialBadge ?? null,
        distanceText: link.distanceText ?? null
      }))
    });
  }

  // 데모 상호작용: 저장 / 방문 / 리뷰
  await prisma.saveExhibition.deleteMany({ where: { userId: memberUser.id } });
  await prisma.saveExhibition.createMany({
    data: [
      { userId: memberUser.id, exhibitionId: "seongsu-light" },
      { userId: memberUser.id, exhibitionId: "hannam-still" },
      { userId: memberUser.id, exhibitionId: "sejong-impressionism" }
    ]
  });

  await prisma.visit.deleteMany({ where: { userId: memberUser.id } });
  await prisma.visit.createMany({
    data: [
      { userId: memberUser.id, exhibitionId: "itaewon-afterimage" },
      { userId: memberUser.id, exhibitionId: "samcheong-flow" }
    ]
  });

  await prisma.review.deleteMany({ where: { userId: memberUser.id } });
  await prisma.review.createMany({
    data: [
      {
        userId: memberUser.id,
        exhibitionId: "itaewon-afterimage",
        recommend: true,
        moodTags: JSON.stringify(["몰입감 최고", "사진 찍기 좋아요"]),
        memo: "밤 풍경 사진이 인상적이었어요. 조용히 감상하기 좋았습니다."
      },
      {
        userId: memberUser.id,
        exhibitionId: "samcheong-flow",
        recommend: true,
        moodTags: JSON.stringify(["공간이 넓어요"]),
        memo: "동선이 흥미로웠어요."
      }
    ]
  });

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
