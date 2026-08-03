# 배포 · 메일 · 이관 스모크 체크리스트

## 0. 배포 전에 “도메인만 남았나?”

로컬/Vercel에 Supabase·Resend·CRON·AUTH 등이 이미 들어가 있다면:

| 항목 | 도메인 없이도 | 커스텀 도메인 필요할 때 |
|------|---------------|------------------------|
| Vercel에 Git 연결 후 배포 | **가능** (`*.vercel.app`) | — |
| 가입 인증·예약 메일 링크 | Preview/프로덕션 URL로 일단 가능 | `NEXT_PUBLIC_APP_URL`을 최종 도메인으로 교체 |
| 네이버 지도 | localhost / vercel.app를 콘솔에 등록 | **최종 도메인을 Web 서비스 URL에 추가** |
| Resend `EMAIL_FROM` | `onboarding@resend.dev`로 테스트 | 브랜드 도메인 인증 후 발신 주소 변경 |
| SEO·작가 아웃리치용 “공식 URL” | 가칭 URL로도 가능 | **커스텀 도메인 권장** |

정리: **배포 자체는 도메인 구매 없이도 가능**합니다.  
작가 메일·지도·브랜드 메일 발신을 “공식 주소”로 쓰려면 도메인을 정한 뒤 Vercel에 연결하고 env만 맞추면 됩니다.

### 도메인은 어디서 사나?

- **원하는 등록 기관에서 사도 됩니다** (가비아, Cloudflare, Namecheap, Google Domains 대체 등). Vercel Domains에 연결만 하면 됩니다.
- **Vercel에서 구매**하면 DNS가 자동으로 붙어 설정이 단순합니다. 가격·이전 유연성은 외부 등록이 나을 때가 많습니다.
- 실무 추천: **Cloudflare 또는 기존에 쓰는 국내 등록처에서 구매 → Vercel Project → Settings → Domains에 추가 → DNS에 Vercel이 안내하는 레코드 입력.**

도메인 연결 후 할 일:

1. Vercel Production에 도메인 연결·HTTPS 확인  
2. `NEXT_PUBLIC_APP_URL=https://your.domain` 갱신 후 재배포  
3. 네이버 지도 콘솔에 해당 origin 추가  
4. (선택) Resend에서 도메인 인증 후 `EMAIL_FROM` 변경  

---

## 1. Vercel 환경 변수

| 변수 | 필수 | 확인 |
|------|------|------|
| `DATABASE_URL` | Yes | [ ] |
| `DIRECT_URL` | Yes (migrate) | [ ] |
| `AUTH_SECRET` | Yes | [ ] |
| `NEXT_PUBLIC_APP_URL` | Yes (프로덕션 URL) | [ ] |
| `RESEND_API_KEY` | Yes (메일) | [ ] |
| `EMAIL_FROM` | 권장 | [ ] |
| `CRON_SECRET` | Yes (프로덕션 cron) | [ ] |
| `NEXT_PUBLIC_SUPABASE_URL` | 업로드 | [ ] |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 또는 anon | 업로드 | [ ] |
| `SUPABASE_SERVICE_ROLE_KEY` | 업로드 | [ ] |
| `SUPABASE_STORAGE_BUCKET` | 업로드 | [ ] |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 지도 | [ ] |
| `KAKAO_REST_API_KEY` | 지오코딩 | [ ] |
| Culture API keys | 공공 전시 sync | [ ] |

로컬 `.env`와 Vercel Production/Preview를 맞춰 둔다. `.env`는 Git에 올리지 않는다.

## 2. DB 마이그레이션

```bash
npx prisma migrate status
npx prisma migrate deploy   # 또는 npm run db:deploy
```

기대: `Database schema is up to date!` / `No pending migrations`.

## 3. Resend 메일 스모크

1. `RESEND_API_KEY` 설정 후 `npm run dev` 또는 배포 URL
2. 신규 이메일로 `/auth/signup` 가입 → 인증 메일 수신 확인
3. `/auth/verify-email?token=...` 로 인증 완료
4. (선택) 예약 1건 → 고객·호스트 메일 (둘 다 `notifyEmail` + `emailVerifiedAt` 필요)

실패 시: Vercel/로컬 로그의 `[email]`, Resend Dashboard 확인.

## 4. Cron 스모크

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_APP_URL/api/cron/ending-soon"
```

로컬에서 `CRON_SECRET` 없으면 development만 통과.

## 5. 소유권 이관 리허설 (1건)

전제: 테스트 작가 계정 = 이메일 인증 + `artistStatus=APPROVED`

1. Admin → **소유권 이관** 탭
2. 대리 등록 공간에 테스트 작가 이메일 입력 → **소유자 연결**
3. 관련 전시 → **등록자 연결**
4. 관련 프로그램 → **주최자 연결**
5. 테스트 작가로 로그인 → MY → 작가 탭에서 항목 표시·수정 확인

CLI 보조 (선택):

```bash
npx tsx scripts/rehearse-ownership-transfer.ts \
  --email artist@example.com \
  --space-id <spaceId> \
  --exhibition-id <exhibitionId>
```

(스크립트는 DB에 직접 이관하며, 승인·인증 조건을 검증한다.)

## 6. 아웃리치 직전

[OUTREACH_DOR.md](./OUTREACH_DOR.md) DoR 전부 체크.
