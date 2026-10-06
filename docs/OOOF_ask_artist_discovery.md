# OOOF. 「작가에게 물어보기」 구현 전 구조 조사

- 조사일: 2026-10-02
- 범위: 저장소 실측. 제품 코드 변경 없음.
- 결론: 질문 기능의 모델·API·다이얼로그·관리자 검수·인앱 알림이 이미 있다. 새로 쌓기보다 `ArtistQuestion` 경로를 확장하는 쪽이 기존 구조와 맞다.

## 1. 스택

| 항목 | 실제 |
|------|------|
| Frontend | Next.js `16.2.9` App Router, React `19.2.7`, TypeScript |
| Routing | `src/app/**/page.tsx`. `src/middleware.ts` 없음 |
| Data fetching | 공개 페이지는 서버 컴포넌트가 `src/lib/*` + Prisma를 직접 호출. 변경은 클라이언트 `fetch("/api/...")` |
| State | 전역 스토어 없음. 컴포넌트 `useState`와 서버 세션 |
| DB | PostgreSQL + Prisma `5.22.0` (`prisma/schema.prisma`). ID 기본값은 `cuid()` |
| 검증 | `zod` |
| 인증 | `jose` JWT를 httpOnly 쿠키 `ooof_session`에 저장 (`src/lib/auth.ts`). 레거시 `exhibit_session` 읽기 후 삭제 |
| 메일 | Resend (`src/lib/email.ts`, `RESEND_API_KEY`) |
| 파일 | Supabase Storage (`/api/upload`) |
| 테스트 | `*.test.ts` / `*.spec.ts` 없음. `package.json`에 test 스크립트 없음 |
| 실행 | `npm run dev`, `npm run build` (`prisma generate && next build`), `npm run lint` |

## 2. 공개 라우트와 private API

공개 페이지는 로그인 없이 HTML을 만든다. 쓰기 API는 라우트 안에서 `getSession()`으로 거절한다. 역할 가드는 각 핸들러에 있고 공통 middleware는 없다.

| 표면 | 경로 | 데이터 |
|------|------|--------|
| 홈 | `/` | 서버 |
| 전시 목록·상세 | `/exhibitions`, `/exhibitions/[id]` | 서버. 상세에 예약 위젯·저장 |
| 덱 | `/decks`, `/decks/[id]` | 서버. 덱은 `Curation` |
| 장소 | `/places/[id]` | 서버. 저장 |
| 작가 공간 | `/spaces/[slug]`, `/artists/[id]` | 서버. 「작가에게 묻기」 트리거 |
| 지도·프로그램 | `/map`, `/programs`, `/programs/[slug]` | 서버 |
| MY | `/my` | 세션 필요. 질문함·덱·달력 |
| 관리자 | `/admin` | `role === "ADMIN"` 아니면 `/`로 redirect |
| 인증 | `/auth/login`, `/auth/signup`, `/auth/verify-email` | |

대표 API:

- 공개 읽기에 가까운 것: `GET /api/exhibitions`, `GET /api/auth/me` (세션 없으면 user null)
- 로그인 필요: `POST /api/questions`, `POST /api/saves`, `POST /api/cards/state`, `POST /api/my/calendar`, `POST /api/my/decks`
- 작가: `PATCH /api/questions/[id]`, `POST /api/exhibitions` (승인 작가)
- 관리자: `/api/admin/*` (`requireAdmin` = `role === "ADMIN"`)

## 3. 모델

| 개념 | 모델 | ID |
|------|------|-----|
| 사용자 | `User` | `cuid`. `role`: MEMBER, ARTIST, GALLERY, ADMIN. `artistStatus`: NONE, PENDING, APPROVED, REJECTED |
| 작가 신청 | `ArtistApplication` | userId unique |
| 전시 | `Exhibition` | **cuid 아님.** 슬러그, `exhibition-${Date.now()}`, `public-${localId}`, `cultureinfo-*` |
| 작품 | `Artwork` | `cuid`, exhibitionId FK |
| 장소 | `Place` | `cuid`. 카페·식당·산책. 작가 공간 아님 |
| 작가 공간 | `Space` | slug 라우트 `/spaces/[slug]` |
| 운영 덱 | `Curation` + `CurationStop` | `/decks/[id]` |
| 개인 덱 | `UserDeck` + `UserDeckCard` | `cardKey`로 원본을 가리킴. 카드 복제 없음 |
| 저장 | `SavedCard` (`userId`+`cardKey`), 레거시 `SaveExhibition` | |
| 달력 | `CalendarEntry` kind CARD 또는 DECK | |
| 질문 | `ArtistQuestion` | 아래 |
| 예약(작가와 대화) | `Reservation` | 전시 또는 프로그램 슬롯 |
| 인앱 알림 | `Notice` | |
| 메일 발송 로그 | `NotificationLog` | dedupe |

`ArtistQuestion` (`prisma/schema.prisma`):

- `kind`: REGISTERED | UNLISTED
- `topic`: EXHIBITION | ARTWORK | VISIT
- `artistUserId` nullable, `unlistedArtistName`, `exhibitionId` nullable
- `fromUserId` nullable이나 현재 POST는 세션 필수
- `fromName`, `fromEmail`, `body`
- `status`: PENDING → APPROVED | REJECTED | ANSWERED | FORWARDED
- `answer`, `answeredAt`, `adminNote`

장소(`Place`)·운영 덱(`Curation`)에는 질문 FK가 없다. 질문은 전시와 작가 사용자에만 연결된다.

## 4. 사용자 식별

- 로그인: 이메일+비밀번호 → JWT 쿠키 7일. `GET /api/auth/me`가 세션을 돌려준다.
- 비로그인: 익명 쿠키·게스트 ID 없음. 저장·질문·달력·개인 덱은 로그인으로 보낸다.
- 이메일 인증 필드(`emailVerifiedAt`)는 있다. 질문 POST는 인증 여부를 따로 보지 않고 세션만 본다.
- 작가로 답하려면 `role`이 ARTIST/GALLERY/ADMIN 이거나 `artistStatus === APPROVED"`.

## 5. 이미 있는 「묻기」와 「작가와 대화」

둘은 다른 기능이다.

### 작가에게 묻기 (질문)

| 역할 | 경로 |
|------|------|
| 다이얼로그 | `src/components/AskArtistDialog.tsx` (`AskArtistDialog`, `AskArtistTrigger`) |
| 주제 상수 | `src/lib/question-topics.ts` |
| 본문·일 3건 제한 | `src/lib/questions.ts` |
| 생성 | `POST /api/questions` — 세션 필수, 상태 PENDING, 관리자 메일 |
| 작가 답변 | `PATCH /api/questions/[id]` |
| 내 질문 | `GET /api/my/questions`, `src/components/MyInboxSection.tsx` |
| 관리자 검수 | `GET/PATCH /api/admin/questions` action: approve, reject, forward, answer |
| 관리자 UI | `src/components/AdminQuestionsPanel.tsx`, `src/app/admin/page.tsx`가 질문을 로드 |
| 노출 위치 | 카드 뒷면 `src/components/OoofCard.tsx`, `src/app/artists/[id]/page.tsx`, `src/app/spaces/[slug]/page.tsx`, 홈 술래 `src/components/ArtistWalkers.tsx` |
| 전시 상세 | **AskArtist 없음.** `ReservationWidget`과 `CollectActions`만 있다 |

승인되지 않은 작가 ID로 들어오면 API가 `kind=UNLISTED`로 바꾸고 운영이 대신 답하는 흐름이다 (`OPERATOR_UNLISTED_NAME`).

### 작가와 대화 (예약)

| 역할 | 경로 |
|------|------|
| 전시 위젯 | `src/components/ReservationWidget.tsx` — 예약 가능하면 슬롯, 아니면 「문의로 방문 가능 여부를 확인해요」 |
| 일정 편집 | `src/components/TalkScheduleEditor.tsx` |
| 등록 폼 | `src/components/ExhibitionRegisterForm.tsx`, `ExhibitionEditForm.tsx` |
| API | `POST /api/reservations`, `src/app/api/exhibitions/route.ts`의 `reservationSchedule` |
| Sticky | `src/components/ExhibitionStickyBar.tsx` — 비예약이면 「현장 방문 · 문의 후 관람」 |
| 프로그램 | `src/components/ProgramReservationWidget.tsx`, `/programs/[slug]` |

저장·덱·달력:

- `src/components/CollectActions.tsx` — 카드 저장, 내 덱, 달력. 비로그인은 `/auth/login?redirect=`
- `src/components/AddToDeckDialog.tsx`
- `src/components/ExhibitionStickyBar.tsx` — 전시 저장
- `POST /api/cards/state`, `POST /api/saves`, `POST /api/my/decks`, `POST /api/my/calendar`

## 6. 알림

- 인앱: `Notice` + `src/lib/notices.ts`. 타입 `QUESTION_ANSWER`, `QUESTION_RECEIVED`, `QUESTION_REJECTED`, `EXHIBITION_ENDING`.
- 메일: `sendEmail` (Resend). 질문 생성 시 관리자에게 직접 발송. 답변·전달은 admin questions 라우트에서 메일과 Notice를 같이 만든다.
- 중복 방지 메일: `src/lib/notifications.ts`의 `sendEmailOnce` → `NotificationLog`. 질문 생성 경로는 이 dedupe를 쓰지 않는다.
- 키 없으면 메일은 skip되고 DB 질문 행은 남는다.

## 7. 재사용 후보

- 모델 `ArtistQuestion`, API `POST /api/questions`, `PATCH /api/questions/[id]`, `PATCH /api/admin/questions`
- UI `AskArtistDialog` / `AskArtistTrigger`
- 알림 `createNotice`, `sendEmail`
- 인증 `getSession`. 비로그인 게스트 저장 패턴은 없다
- 전시 상세에 붙일 자리: `src/app/exhibitions/[id]/page.tsx` (현재 예약 위젯·CollectActions)

## 8. 구현 시 위험 (5)

1. **이미 있는 질문 스택과 중복.** 새 테이블·새 엔드포인트를 만들면 검수·알림·MY 함이 갈라진다.
2. **비로그인 불가.** `POST /api/questions`는 401이다. 게스트 질문을 열려면 기존 세션 계약을 깨게 된다.
3. **공공·팝업 전시는 승인 작가가 없는 경우가 많다.** 그때 질문은 UNLISTED로 떨어져 운영 답변 큐가 된다. 전시 상세에 버튼을 열면 작가 답변처럼 보이면 안 된다.
4. **「작가와 대화」예약 위젯과 카피가 겹친다.** 전시 상세의 문의 문구는 질문 API와 연결되어 있지 않다.
5. **메일은 Resend 설정에 의존하고, 작가는 관리자 approve 뒤에야 Notice를 받는다.** 키 미설정·검수 정체 시 질문 행만 쌓인다.

## 9. 테스트

자동 테스트 러너가 없다. 확인은 `npm run dev` 후 질문 생성 → `/admin` 검수 → `/my` 알림, 그리고 `npm run lint`이다.
