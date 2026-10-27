---
name: OOOF.
description: 숨은 동네 전시와 작가 공간을 찾아 알려 주는 방문 플랫폼.
colors:
  everyman-bg: "#F3F3F1"
  everyman-surface: "#EBEBE9"
  everyman-ink: "#1A1A1A"
  everyman-muted: "#6F6F6B"
  everyman-border: "#E0E0DC"
  explorer: "#5A6B7D"
  explorer-soft: "#E8EDF2"
  explorer-deep: "#3D4A57"
  hero: "#E4572E"
  hero-soft: "#FCEDE7"
  hero-deep: "#C2410C"
  on-accent: "#FFFFFF"
typography:
  display:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "14px"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Poppins, Pretendard, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
rounded:
  sm: "4px"
  md: "14px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "28px"
  page: "min(1180px, calc(100vw - 40px))"
components:
  button-primary:
    backgroundColor: "{colors.explorer}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.on-accent}"
    textColor: "{colors.everyman-ink}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "46px"
  button-hero:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    height: "46px"
  chip:
    backgroundColor: "{colors.everyman-surface}"
    textColor: "{colors.everyman-ink}"
    rounded: "{rounded.pill}"
    padding: "9px 15px"
  input:
    backgroundColor: "{colors.on-accent}"
    textColor: "{colors.everyman-ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "48px"
---

# Design System: OOOF.

## Overview

**Creative North Star: "동네에서 들리는 외침"**

Olly Olly Oxen Free는 숨어 있던 사람이 불이익 없이 나와도 된다는 외침이다. 화면은 그 말을 동네 미술에 적용한다. 넓은 면은 조용한 돌색이고, 길을 찾는 동작만 슬레이트로 드러나며, 주황은 등록처럼 용기를 내는 순간에만 쓴다.

밀도는 갤러리 카탈로그보다 동네 안내판에 가깝다. 한 화면의 주 행동은 하나다. 사진이 없을 때도 제목, 장소, 기간이 먼저 읽혀야 한다.

**Key Characteristics:**

- 60% Everyman 중립, 30% Explorer 슬레이트, 10% Hero 주황.
- 한글 UI는 Pretendard. 워드마크 `OOOF.`만 Poppins.
- 알약형 버튼과 칩. 카드는 얇은 경계와 짧은 그림자로만 들린다.
- 모션은 숨었다가 나타나는 정도. 튀는 바운스와 깜박임은 쓰지 않는다.

원본 설명은 `docs/brand/VISUAL_SYSTEM.md`와 `docs/brand/BRAND_IDENTITY.md`다. 값이 다르면 그 문서와 `src/app/globals.css`의 `:root`를 따른다.

## Colors

돌색 바탕 위에 슬레이트가 길을 표시하고, 주황은 드물게 행동을 표시한다.

### Primary

- **동네 잉크** (#1A1A1A): 제목과 본문. 화면의 기본 글자색.
- **발견 슬레이트** (#5A6B7D): 사이트 전역의 링크, 활성 상태, 기본 primary 버튼. Explorer 30%.

### Secondary

- **슬레이트 소프트** (#E8EDF2): 발견 상태를 받치는 옅은 면.
- **슬레이트 딥** (#3D4A57): 지도·영상처럼 더 가라앉은 발견 면.

### Tertiary

- **등록 주황** (#E4572E): `/register` 등록 허브의 배너와 primary CTA. 사이트 전체 버튼의 기본색이 아니다.
- **주황 소프트** (#FCEDE7), **주황 딥** (#C2410C): 등록 화면의 보조 면과 눌림.

### Neutral

- **돌 배경** (#F3F3F1): 페이지 바탕.
- **돌 면** (#EBEBE9): 카드와 칩의 기본 면.
- **돌 경계** (#E0E0DC): 구분선.
- **돌 보조글** (#6F6F6B): 메타 정보.

### Named Rules

**10% 규칙.** 주황은 한 화면에서 가장 중요한 등록·제출 행동에만 쓴다. 홈과 전시 목록의 기본 버튼은 슬레이트다.

**단어 규칙.** 제품 표기는 `OOOF.`다. `Ooof`, `ooof`, 글자 사이 공백은 쓰지 않는다. 꾀꼬리는 캠페인 보조이고 헤더 로고가 아니다. MLB Orioles를 떠올리게 하는 주황·검정 마스코트는 쓰지 않는다.

## Typography

**Display Font:** Pretendard
**Body Font:** Pretendard (16px, 줄간격 1.6)
**Wordmark:** Poppins. 한글이 섞이면 Pretendard로 떨어진다.

본문 입력칸은 16px 이상을 유지한다. 라벨이 14px여도 칸 안 글자는 16px이다. 모바일에서 확대가 튀는 것을 막되, 페이지 확대 자체는 막지 않는다.

## Layout

본문 폭은 `min(1180px, calc(100vw - 40px))`이고, 720px 이하에서는 좌우 14px로 줄어든다.

데스크톱은 상단 헤더. 720px 이하에서는 브랜드와 상단 메뉴를 숨기고 검색과 하단 5탭(홈, 덱, 전시, 지도, MY)을 쓴다. 하단 탭은 홈 인디케이터 위에 놓이고, 본문은 그 높이만큼 아래에서 밀린다.

지도 영역은 `100vh`에 더해 `100dvh`를 쓴다. 모바일 주소창이 높이를 바꿔도 지도가 잘리지 않게 한다.

`/register` 랜딩의 틀은 색과 따로 적는다. 한 문장의 제목, 18px 본문, 사실 숫자 세 칸, 버튼 하나, 그 아래 등록 순서. 이미지가 들어갈 때는 작품이 글자보다 먼저 보이게 하고, 숫자는 그 옆의 근거로만 둔다. getdesign.md의 DESIGN.md는 색·서체·간격 토큰이지, 스크롤 구간이나 이미지 크기까지 담는 배치도가 아니다. 배치를 남기려면 이 문단처럼 화면 단위로 적는다.

## Elevation & Depth

그림자는 하나다. `0 22px 70px rgba(26, 26, 26, 0.08)`. 카드 위에 카드를 쌓거나 네온 글로우를 쓰지 않는다. 구분은 경계선과 면 색으로 한다.

## Shapes

버튼과 필터 칩은 알약. 입력칸은 14px. 워드마크 옆 마크는 4px. 원형은 프로필 버튼에만 쓴다.

## Components

- **Primary button:** 슬레이트 바탕, 흰 글자, 높이 46px 이상.
- **Secondary button:** 흰 바탕, 잉크 글자, 돌색 테두리.
- **Hero button:** 등록 허브에서만 주황. `.register-page`가 accent를 주황으로 바꾼다.
- **Chip:** 선택 전 돌색 면, 선택 후 잉크 바탕에 흰 글자. 터치 높이는 44px 이상.
- **Input:** 흰 바탕, 48px, 16px 글자. 오류 글자는 `#B42318`.
- **Bottom tab:** 고정, 반투명 흰 바탕. 활성 탭은 슬레이트.

## Do's and Don'ts

- Do: 장소, 기간, 다음 행동을 먼저 보여 준다.
- Do: 새 화면을 만들 때 이 파일의 토큰만 쓴다. 임의의 보라, 크림, 테라코타를 추가하지 않는다.
- Do: 호버 스타일은 `@media (hover: hover) and (pointer: fine)` 안에 둔다.
- Don't: 크림 배경 + 테라코타 + 세리프 조합. Noto Serif KR을 디스플레이로 쓰지 않는다.
- Don't: 퍼플 글로우, 이끼색을 사이트 전체 강조색으로 쓰기, 네온 그라데이션.
- Don't: `user-scalable=no` 또는 `maximum-scale=1`.
- Don't: Taste Skill의 기본 스킬로 이 화면을 다시 스타일링하지 않는다. 참고는 레이아웃 변주를 볼 때뿐이고, 채택 색과 서체는 이 파일이 이긴다.
- Don't: `/register`에서 전시 페이지가 열린 횟수를 월간 방문자 수라고 적지 않는다. 작가 수가 적어도 그 숫자를 사회적 증거처럼 키우지 않는다.
- Don't: 지도, 긴 목록, 필터 스크롤에 장식 애니메이션을 넣지 않는다.
