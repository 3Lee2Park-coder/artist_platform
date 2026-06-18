# artist_platform

전시 방문 전환형 플랫폼 MVP 프로토타입입니다.

## Next.js App Router 구조

```txt
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    ArtworkCard.tsx
    ExhibitionCard.tsx
    Footer.tsx
    Header.tsx
    HomeHeroModule.tsx
    SectionHeader.tsx
    VideoSpotlight.tsx
  data/
    exhibitions.ts
  types/
    exhibition.ts
```

## 현재 구현 범위

- 메인 홈페이지 화면
- Airbnb형 필터 SearchBar UI
- SearchBar 아래 Hero CTA 탭
  - CTA 클릭 시 `HeroExhibition`만 변경
- 오늘의 발견 섹션
- 활성 카테고리별 전시 섹션
- 랜덤 작품 발견 섹션
- 작가 업로드 영상 메인 섹션
- 근처 전시 섹션
- 데스크탑/모바일 반응형 스타일

## 실행

```bash
npm install
npm run dev
```
