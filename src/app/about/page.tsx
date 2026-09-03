import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AboutSpotlight } from "@/components/AboutSpotlight";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

export const metadata = {
  title: "회사소개 | 동네 예술을 잇는 숨바꼭질, OOOF.",
  description: `${BRAND.mark}(${BRAND.koreanAlias}) 는 일상 속 숨겨진 동네 전시와 예술 공간을 발견하고 연결하는 아트 플랫폼입니다. 걸어서 만나는 동네 예술 코스를 지금 확인해 보세요.`,
  keywords: [
    BRAND.mark,
    BRAND.koreanAlias,
    BRAND.fullName,
    "회사소개",
    "동네 전시",
    "전시 큐레이션",
    "예술 공간",
    "동네 예술 플랫폼"
  ],
  alternates: { canonical: "/about" }
};

const PILLARS = [
  {
    icon: "map",
    title: "동네 전시 발견 가이드",
    titleBreak: ["동네 전시", "발견 가이드"],
    body: "혼자 숨은 전시를 찾아 헤맬 필요가 없습니다. 걸어서 만날 수 있는 동네 코스와 방문 정보로, 예술로 향하는 길을 엽니다."
  },
  {
    icon: "door",
    title: "작가의 든든한 파트너",
    titleBreak: ["작가의", "든든한 파트너"],
    body: "작가가 준비되었을 때 안전하게 모습을 드러낼 수 있도록, 공간·프로그램·예약 그리고 관리까지 도와드립니다."
  },
  {
    icon: "walk",
    title: "걸어서 만나는 밀도 높은 예술",
    titleBreak: ["걸어서 만나는", "밀도 높은 예술"],
    body: "걸어 다닐 수 있는 코스 단위로 숨은 장소를 모읍니다. 도보로 닿는 거리 안의 공간들을 밀도 있게 엮어냅니다."
  }
];

function PillarIcon({ type }: { type: string }) {
  if (type === "door") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 21h16M6 21V4.5L16 3v18M16 7h3v14M12.5 12h.01" />
      </svg>
    );
  }

  if (type === "walk") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="13" cy="4" r="2" />
        <path d="m10 22 1-6-3-3 2-5 4 3 4 1M6 22l2-5M14 11l-2 5 4 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="about-page">
        <section className="page-shell about-hero-shell">
          <div className="about-hero">
            <p className="eyebrow">About Us</p>
            <h1>
              <span className="brand-wordmark">OOOF.</span>
            </h1>
            <p className="about-fullname-name">
              {BRAND.fullName}
              <span className="about-korean-alias"> · {BRAND.koreanAlias}</span>
            </p>
            <p className="about-lead">
              {BRAND.fullName}는
              <br className="about-break" />
              숨바꼭질이 끝날 때, 숨어 있던 사람이
              <br className="about-break" />
              밖으로 나와도 된다는 외침입니다.
            </p>
            <p className="about-lead">
              우리는 이 외침을 동네 예술에 적용합니다.
              <br className="about-break" />
              숨겨진 보석 같은 공간들을 발굴하고,
              <br className="about-break" />
              사람과 예술을 다정하게 이어줍니다.
            </p>
            <p className="about-lead about-lead-meta">
              브랜드 마크는 {BRAND.mark}, 한국어로는{" "}
              <strong>{BRAND.koreanAlias}</strong>로 읽습니다.
              <br />
              {BRAND.descriptor}.
              <br />
              캠페인 문장은 「{BRAND.campaignLine}」
              <br className="about-break" />
              서비스를 한 줄로 말하면 「{BRAND.productLine}」입니다.
            </p>
          </div>
          <AboutSpotlight />
        </section>

        <section className="about-pillars-section">
          <div className="page-shell about-pillars-inner">
            <div className="about-section-heading">
              <p className="eyebrow">핵심 가치</p>
              <h2>
                OOOF.가 예술을 연결하는
                <br />
                3가지 방법
              </h2>
              <p>OOOF.가 만들어가는 특별한 연결의 가치</p>
            </div>
            <ul className="about-pillars">
              {PILLARS.map((item, index) => (
                <li
                  key={item.title}
                  className={`about-pillar-card about-pillar-card--${index + 1}`}
                >
                  <span className="about-pillar-icon">
                    <PillarIcon type={item.icon} />
                  </span>
                  <span className="about-pillar-index">0{index + 1}</span>
                  <h3>
                    {item.titleBreak[0]}
                    <br className="about-break" />
                    {item.titleBreak[1]}
                  </h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
            <p className="about-pillars-hint">옆으로 밀어 다음 가치를 보세요</p>
          </div>
        </section>

        <div className="page-shell about-closing">
          <section className="about-story-section">
            <span className="about-story-quote" aria-hidden="true">
              “
            </span>
            <div className="about-story-copy">
              <p className="eyebrow">Campaign Story</p>
              <h2>
                우리의 이야기
                <span className="about-inline-mark">: </span>
                <br className="about-break" />
                못 찾겠다, 꾀꼬리?
              </h2>
              <p>
                어릴 적 숨바꼭질을 끝내고{" "}
                <br className="about-break" />
                친구들을 불러 모으던 정겨운 외침은,{" "}
                <br className="about-break" />
                이제 숨은 전시와 <strong>OOOF.</strong>를 잇는{" "}
                <br className="about-break" />
                따뜻한 브랜드 스토리가 되었습니다.
              </p>
              <p>
                <strong>{BRAND.fullName}</strong>는{" "}
                <br className="about-break" />
                누구나 일상에서 예술을 쉽게 찾고{" "}
                <br className="about-break" />
                즐길 수 있는 세상을 꿈꿉니다.
              </p>
            </div>
          </section>

          <section className="about-cta">
            <div>
              <p className="eyebrow">Open the Door</p>
              <h2>
                지금 바로{" "}
                <br className="about-break" />
                예술과 연결될 시간입니다
              </h2>
              <p>
                관객은 숨은 전시를 찾고,{" "}
                <br className="about-break" />
                작가는 문을 열어 관객을 맞이합니다.{" "}
                <br className="about-break" />
                OOOF.와 함께 두 길이 만나는 여정을 시작해 보세요.
              </p>
            </div>
            <div className="about-actions">
              <Link className="primary-button" href="/exhibitions">
                전시 찾아보기
              </Link>
              <Link className="secondary-button" href="/for-artists">
                작가로 참여하기
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
