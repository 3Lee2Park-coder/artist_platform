import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

export const metadata = {
  title: "회사소개",
  description: `${BRAND.mark}(${BRAND.koreanAlias}) · ${BRAND.fullName}. ${BRAND.descriptor}. 숨바꼭질의 화해 외침을 동네 예술에 적용합니다.`,
  keywords: [
    BRAND.mark,
    BRAND.koreanAlias,
    BRAND.fullName,
    "회사소개",
    "동네 전시"
  ],
  alternates: { canonical: "/about" }
};

const PILLARS = [
  {
    title: "찾아 알려준다",
    body: "혼자 술래가 되어 흩어진 전시를 찾지 않아도 됩니다. 동네 코스·지도·방문 정보로 길을 엽니다."
  },
  {
    title: "문을 열면 찾아온다",
    body: "작가가 준비되었을 때 안전하게 모습을 드러낼 수 있도록, 공간·프로그램·예약까지 붙입니다."
  },
  {
    title: "동네 단위의 밀도",
    body: "전국을 한꺼번에 채우지 않습니다. 걸어 다닐 수 있는 코스 단위로 숨은 장소를 모읍니다."
  }
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="page-shell about-page">
        <section className="about-hero">
          <p className="eyebrow">About</p>
          <h1>
            <span className="brand-wordmark">OOOF.</span>
          </h1>
          <p className="about-fullname-name">
            {BRAND.fullName}
            <span className="about-korean-alias"> · {BRAND.koreanAlias}</span>
          </p>
          <p className="about-lead">
            {BRAND.fullName}는 숨바꼭질에서 숨어 있던 사람이 불이익 없이 나와도
            된다는 화해의 외침입니다. 브랜드 마크는 {BRAND.mark}, 한국어로는{" "}
            <strong>{BRAND.koreanAlias}</strong>로 읽습니다. {BRAND.mark}는 그
            외침을 동네 예술에 적용합니다.
          </p>
          <p className="about-lead">
            {BRAND.descriptor}. 캠페인 문장으로는 「{BRAND.campaignLine}」,
            제품 한 줄로는 「{BRAND.productLine}」입니다.
          </p>
        </section>

        <section className="about-section">
          <h2>우리가 하는 일</h2>
          <ul className="about-pillars">
            {PILLARS.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-section">
          <h2>한국적 다리</h2>
          <p>
            “못 찾겠다, 꾀꼬리?”는 정식 영문 명칭이 아니라, 숨바꼭질과 OOOF.를
            잇는 캠페인·스토리 문장입니다. 제품 워드마크는 언제나{" "}
            <strong>OOOF.</strong>이고, 풀네임은{" "}
            <strong>{BRAND.fullName}</strong>입니다.
          </p>
        </section>

        <section className="about-section about-cta">
          <h2>같이 길을 열까요?</h2>
          <p>
            관객은 숨은 전시를 찾고, 작가는 문을 열어 관객을 맞이합니다. 두 길을
            OOOF.에서 이어 보세요.
          </p>
          <div className="about-actions">
            <Link className="primary-button" href="/exhibitions">
              전시 찾기
            </Link>
            <Link className="secondary-button" href="/for-artists">
              작가로 열기
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
