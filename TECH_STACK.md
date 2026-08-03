# Exhibit — 기술 스택 & 배포 가이드

## Supabase 연결 (중요)

Supabase에서 받는 값은 **용도별로 다릅니다**. URL + Publishable Key만으로는 Prisma DB 연결이 되지 않습니다.

| 환경 변수 | 용도 | 어디서 복사? |
|-----------|------|-------------|
| `DATABASE_URL` | **Prisma → PostgreSQL** | Dashboard → **Project Settings → Database → Connection string (URI)** |
| `NEXT_PUBLIC_SUPABASE_URL` | Storage / Supabase 클라이언트 | Dashboard → **Project Settings → API → Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 (또는 Publishable key) | Dashboard → **API → anon / publishable key** |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 파일 업로드** (필수 권장) | Dashboard → **API → service_role** (비밀!) |
| `SUPABASE_STORAGE_BUCKET` | Storage 버킷 이름 | Storage에서 `exhibit-media` public 버킷 생성 |

### .env 예시

```env
# Transaction pooler — 앱 실행용 (포트 6543)
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session pooler — 마이그레이션용 (포트 5432, pooler 호스트)
DIRECT_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

> **Dashboard에서 URI를 그대로 복사**하세요. region(`ap-northeast-2` 등)은 프로젝트마다 다릅니다.

### P1001: Can't reach database server (자주 발생)

| 원인 | 해결 |
|------|------|
| **Direct connection** (`db.xxx.supabase.co:5432`) | 로컬에서 막히는 경우 많음 → **Pooler URI** 사용 |
| `DATABASE_URL` **중복** 정의 | `.env`에 한 줄만 남기기 (SQLite 줄 삭제) |
| 비밀번호에 `@` `#` `%` | URL 인코딩 (`@` → `%40`) |
| `@@` 로 이스케이프 | Prisma는 `%40` 인코딩이 더 안전 |

```bash
# .env 수정 후
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### 로컬에서 Supabase DB만 연결해도 되나?

**네, 됩니다.** 로컬 `npm run dev` + 원격 Supabase PostgreSQL 조합은 일반적인 개발 방식입니다. Storage도 같은 Supabase 프로젝트를 쓰면 됩니다.

### Supabase Storage 설정

1. Supabase Dashboard → **Storage** → **New bucket**
2. 이름: `exhibit-media`, **Public bucket** 체크
3. (선택) Policies에서 authenticated upload 허용 — service_role 사용 시 생략 가능
4. `.env`에 `SUPABASE_SERVICE_ROLE_KEY` 추가
5. 전시 등록 시 대표 이미지 / 작품 이미지 / 영상 업로드 → `/api/upload` → Storage URL 저장

---

## 네이버 지도 (로컬)

- **로컬에서도 동작합니다.** `http://localhost:3000`만 Web 서비스 URL에 등록하면 됩니다.
- `/map` 경로는 **별도 등록 불필요** (origin 단위)
- 2024년 이후 NCP는 `ncpKeyId` 파라미터 사용 → 코드 반영됨
- 콘솔에서 **Web Dynamic Map** API가 활성화되어 있어야 함
- Client ID = API Key ID (Application 등록 후 발급)

---

## 전시가 홈에 안 보이던 이유

홈/지도/검색은 **진행 중인 전시**만 표시합니다 (`startDate ≤ 오늘 ≤ endDate`).

- 이전 코드: 오늘 날짜가 `2026-06-18`로 **고정** → 실제 날짜와 불일치
- 시작일을 **미래**로 등록하면 상세 페이지는 열리지만 목록에는 안 나옴

→ **오늘 날짜(KST) 자동 사용**으로 수정했습니다. 시작일은 오늘 이전~오늘, 종료일은 오늘 이후로 설정하세요.

---

## 전시 ID(URL)가 필요했던 이유

`/exhibitions/[id]` 주소의 slug입니다. 이제 **제목에서 자동 생성**되며, 중복 시 `-1`, `-2` suffix가 붙습니다.

---

## 로컬 실행

```bash
npm install
cp .env.example .env   # DATABASE_URL, RESEND, CULTURE_PUBLIC_API_KEY 등 채우기
npx prisma db push     # 스키마 변경 반영 (또는 migrate dev)
npm run db:seed        # (선택) 데모 데이터 — demo 계정은 emailVerifiedAt 포함
npm run dev
```

### 이메일 / 알림 (MVP)

| 환경 변수 | 용도 |
|-----------|------|
| `RESEND_API_KEY` | 가입 인증, 예약 확인, 저장 전시 마감 알림 |
| `EMAIL_FROM` | 발신 주소 (Resend 도메인 인증 후 변경) |
| `NEXT_PUBLIC_APP_URL` | 인증 링크·전시 상세 URL |
| `CRON_SECRET` | `/api/cron/ending-soon` 보호 (Vercel Cron) |

- 회원가입: **이름·이메일·비밀번호·생년월일** + 휴대폰(선택) → **이메일 인증** 후 로그인
- 예약 성공 시 확인 메일 (`NotificationLog`로 중복 방지)
- 저장 전시 **D-7 / D-3 / D-1** 마감 알림 (매일 cron, `vercel.json` 참고)

### 공공 전시 API

| 환경 변수 | 용도 |
|-----------|------|
| `CULTURE_PUBLIC_API_KEY` | 문화체육관광부 API_CCA_145 |
| `CULTURE_PUBLIC_API_URL` | 기본값 `https://api.kcisa.kr/openapi/API_CCA_145/request` |

관리자 → **데이터 로그** 탭 → **공공 전시 가져오기** 로 동기화 (`source: PUBLIC_API`).

### 데모 계정 (비밀번호: demo1234)

- `member@exhibit.kr` — 일반 회원
- `artist@exhibit.kr` — 승인된 작가
- `admin@exhibit.kr` — 관리자
