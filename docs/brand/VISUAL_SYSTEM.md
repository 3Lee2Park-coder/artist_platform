# Visual System & Voice Cues

> UI에 쓰는 컬러·폰트·이미지 톤·보이스 큐 SSOT.  
> 아키타입: **Everyman (primary)** · 수요 **Explorer** · 공급 **Hero**  
> 정체성: [BRAND_IDENTITY.md](./BRAND_IDENTITY.md)

Working name (UI): **Sokkup**

---

## 1. 컬러 — 60 / 30 / 10

| 비율 | 아키타입 | 역할 | Hex | 쓰임 |
|------|----------|------|-----|------|
| **60%** | Everyman | 일상·중립·넓은 면 | bg `#F3F3F1` · ink `#1A1A1A` · surface `#EBEBE9` · border `#E0E0DC` | 배경, 본문, 카드 기본 |
| **30%** | Explorer | 발견·동선·지도 | `#5A6B7D` · soft `#E8EDF2` · deep `#3D4A57` | 사이트 전역 accent(CTA·링크·아이브로우·활성) |
| **10%** | Hero | 의지·행동 | `#E4572E` · soft `#FCEDE7` · deep `#C2410C` | **`/register` 등록 허브** 배너·진행 칩·권장 카드·primary CTA |

**이유**
- Everyman 60: 문턱 낮은 “동네” 감각 — 튀지 않는 스톤 중립.
- Explorer 30: 길을 찾는 슬레이트(하늘·지도) — 초록 대신 발견 톤.
- Hero 10: 행동 촉구용 엠버 — 공급자 등록 화면에만 집중해 사이트 전체가 공격적으로 보이지 않게 함.

**피하기:** 퍼플 글로우, 이끼 초록 전면 accent, 크림+테라코타+세리프 세트.

토큰: `--everyman-*` · `--explorer*` · `--hero*` (`globals.css` `:root`)  
등록 페이지는 `.register-page { --accent: var(--hero); }` 로 로컬 오버라이드.

---

## 2. 폰트

| 역할 | 폰트 | 근거 |
|------|------|------|
| UI / 본문 / 한글 헤드 | **Pretendard** | 최근 KR 웹 표준에 가까운 산세리프 |
| 영문 브랜드 (Sokkup 등) | **Poppins** | 라틴 워드마크·B2B 영문 헤드라인 |

Noto Serif KR는 사용하지 않음 (고풍·정석 인상).  
대안 후보였던 Noto Sans KR / Spoqa는 Pretendard fallback 스택에만 둠.

---

## 3. 보이스 앤 톤 큐 (3)

### Cue A — Everyman · 「동네처럼」
장소·시간·행동. 문턱 낮추기.

### Cue B — Explorer · 「울타리 밖으로」
발견·동선·재미. “지금 갈 수 있는” 자유.

### Cue C — Hero · 「의지가 길을 연다」
등록·작가면. Grow / Amplify 류 B2B 동력 + 구체 행동 CTA.

| 화면 | 주 큐 |
|------|--------|
| 홈·지도·검색 | A + B |
| `/register` | C (+ A 단계 안내) |
| `/for-artists` | A + C (색은 Explorer 유지, 카피만 Hero) |

---

## 4. 이미지 톤앤매너

| Do | Don’t |
|----|--------|
| 공방·쇼룸·거리·자연광 | 럭셔리 화이트큐브만 |
| 방문 맥락(입구·작업대) | 스톡 악수·추상 그라데이션만 |
| 낮은 채도 | 네온·퍼플 글로우 |

히어로 오버레이: Everyman ink / Explorer slate 반투명.

---

## 5. CTA 동사 사전

| 권장 | 지양 |
|------|------|
| 둘러보기, 코스 걷기, 등록하기, 대화 예약하기 | 지금 구매, 특가, Airbnb 비유 |
| Grow Your Space / 직접 열어 보세요 | 선정되었습니다, 반드시 |

---

## 6. 결정 로그

| 날짜 | 결정 |
|------|------|
| 2026-08-05 | (초안) moss + serif |
| 2026-08-05 | **60 Everyman / 30 Explorer slate / 10 Hero ember(등록)**. Pretendard + Poppins |
