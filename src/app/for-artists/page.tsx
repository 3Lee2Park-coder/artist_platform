import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSession, isApprovedArtist } from "@/lib/auth";
import Link from "next/link";

export const metadata = {
  title: "작가로 열기 | Sokkup",
  description:
    "공방·쇼룸을 직접 열고, 프로그램과 전시를 올려 관객과 만나는 Sokkup 작가 안내"
};

const STEPS = [
  {
    title: "계정 만들기",
    body: "이메일로 가입하고 로그인한 뒤, 작가 승인만 받으면 공간을 열 수 있습니다."
  },
  {
    title: "공간 열기",
    body: "공방·쇼룸의 주소, 방문 정책(워크인/운영시간/예약), 사진을 올립니다. 방문자가 ‘지금 가도 되는지’를 바로 이해하도록 적어 주세요."
  },
  {
    title: "프로그램·전시",
    body: "오픈 스튜디오, 작가와의 대화, 기간 전시를 공간에 연결합니다. 예약이 필요한 일정은 슬롯만 채우면 알림까지 이어집니다."
  },
  {
    title: "동네 코스에 실리기",
    body: "운영이 동네 코스에 공간을 넣으면 홈·지도·코스 상세에 함께 노출됩니다. 도보 동선으로 발견됩니다."
  }
];

const BENEFITS = [
  {
    title: "관객에게 다가가는 창구",
    body: "검색·지도·코스 한곳에 공간이 모입니다. Instagram만으로는 안 보이는 ‘지금 갈 수 있는 곳’을 보여 줍니다."
  },
  {
    title: "방문 정책이 먼저",
    body: "예약제·프로그램 전용·워크인을 바로 표시해, 헛걸음과 불필요한 문의를 줄입니다."
  },
  {
    title: "예약·알림",
    body: "프로그램·작가와의 대화 예약이 들어오면 이메일로 알려 드립니다. 새 예약 툴을 배울 필요가 없습니다."
  }
];

export default async function ForArtistsPage() {
  const session = await getSession();
  const approved = Boolean(session && isApprovedArtist(session));

  return (
    <>
      <Header />
      <main className="page-shell for-artists-page">
        <section className="for-artists-hero">
          <p className="eyebrow">For artists & spaces</p>
          <h1>
            작업이 있는 곳을
            <br />
            직접 열어 보세요
          </h1>
          <p className="for-artists-lead">
            Sokkup은 작가가 관객에게 더 적극적으로 다가갈 수 있는 창구입니다.
            공방·쇼룸·전시를 동네 코스로 잇고, 지도와 방문 안내·예약까지 붙입니다.
            의지가 있는 곳에 길이 있습니다 — 같이 만들어 갑시다.
          </p>
          <div className="for-artists-actions">
            {approved ? (
              <Link className="primary-button" href="/register">
                등록 허브 열기
              </Link>
            ) : session ? (
              <Link className="primary-button" href="/register/artist">
                작가 승인 신청
              </Link>
            ) : (
              <Link
                className="primary-button"
                href="/auth/signup?redirect=/register/artist"
              >
                작가로 시작하기
              </Link>
            )}
            <Link className="secondary-button" href="/register">
              등록 흐름 보기
            </Link>
          </div>
        </section>

        <section className="for-artists-section">
          <h2>이렇게 엽니다</h2>
          <ol className="for-artists-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="for-artists-step-num">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="for-artists-section">
          <h2>작가에게 돌아오는 것</h2>
          <div className="for-artists-benefits">
            {BENEFITS.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="for-artists-section for-artists-checklist">
          <h2>열기 전에 준비하면 좋은 것</h2>
          <ul>
            <li>공간 대표 사진 3장 이상 (입구·작업대·작품)</li>
            <li>방문 가능 요일·시간, 예약이 필요한지 여부</li>
            <li>프로그램이 있다면 날짜·인원·참가비</li>
            <li>포트폴리오 또는 Instagram 링크</li>
          </ul>
          <p className="field-hint">
            공간은 관리자 검수 후 공개됩니다. 검수가 끝나면 MY에서 수정할 수
            있습니다. 대화·전시 등록은 필수가 아닙니다.
          </p>
        </section>

        <section className="for-artists-cta">
          <h2>지금 공간을 열어 보세요</h2>
          <p>승인 신청부터 첫 공간 등록까지, 준비가 되면 하루 안에도 시작할 수 있습니다.</p>
          <Link className="primary-button" href="/register">
            등록 허브 열기
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
