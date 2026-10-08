# P8 — Ask 루프 릴리즈 체크리스트

작성일: 2026-10-03  
범위: Question intake (P1–P7)  
배포: **이 문서 작성 시점에는 Vercel 배포를 수행하지 않음**

## 릴리즈 체크리스트

- [x] 단위 테스트 `question-intake` 13/13
- [x] P4 토큰 스모크 (해시만 저장, 재사용/만료 거부, private 기본)
- [x] P5 질문자 재방문 스모크 (본인 확인 / 타 사용자 차단 / Notice)
- [x] P6 public Q&A 스모크 (0건 숨김 / 1건+ 노출 / 최대 3 / 이메일 미노출)
- [x] P8 통합 스모크 30/30 (`scripts/smoke-p8-release.ts`)
- [x] Prisma migrate status: **Database schema is up to date**
- [x] 전시 상세 200 + 저장/덱 CTA + Ask CTA 공존
- [x] `/decks` 200
- [x] 관리자 API: MEMBER 403 / ADMIN 200 / 비로그인 403
- [x] 저장 API 비로그인 401 (`/api/cards/state`, `/api/saves`)
- [x] `/questions` → `/my#inbox` 리다이렉트
- [ ] 스테이징에서 실메일(Resend) 1회 수동 확인
- [ ] 모바일 Safari / Chrome 실기기 스모크 (아래 Known: 로컬 HTML 검증만)
- [ ] 프로덕션 배포 (순서 준수) — **아직 미실행**

## 테스트 결과 (로컬 `http://127.0.0.1:3001`)

| 흐름 | 결과 |
|------|------|
| 전시 상세 → 질문 제출 (게스트 이메일) | PASS 201, `contactEmail` 저장 |
| 전시 상세 → 질문 제출 (로그인) | PASS 201, `userId`+`notifyOnAnswer` 저장 |
| 운영자 검토 → 전달·토큰 발급 | PASS, `/q/...` URL 1회 노출 |
| 작가 토큰 답변 | PASS 200, `visibility=private` |
| 토큰 재사용 | PASS 410 |
| 토큰 만료 | PASS 410 |
| 질문자 `/my/questions/[id]` | PASS 본인 / 타 사용자 답변 미노출 |
| public 수동 전환 → 전시 슬림 블록 | PASS (이메일 미노출) |
| private 복귀 | PASS |
| 빈 질문 API | PASS 400 |
| CollectActions 위계 (코드) | PASS Ask는 저장 CTA 아래 |
| Domain EventLog `ARTIST_QUESTION_CREATE` | PASS (row 존재) |

보안·개인정보

- 토큰 원문 DB 미저장 (hash only)
- `/q`·전시 public 블록에 asker 이메일 미노출
- public shape에서 contact/ops/token 제외 (단위 테스트)

## 알려진 이슈

1. **`POST /api/intake-questions`가 `questionId`를 응답하지 않음**  
   UI는 `ok`만 사용하므로 기능 영향 없음. 향후 GA4 `question_create` 매핑 시 응답/메타에 id 추가 권장.
2. **`ARTIST_QUESTION_CREATE` EventLog metadata에 `questionId` 없음**  
   exhibitionId·userId·source는 있음. GA4 연결 전 metadata 보강 필요.
3. **게스트 질문(`userId=null`)은 `/my` 함에 안 보임**  
   메일 링크로만 유도. 계정 생성 후 이메일 claim은 미구현.
4. **작가/갤러리 자동 발송 없음**  
   운영자가 링크 복사 전달 (의도된 MVP).
5. **실기기 Safari/Chrome viewport**  
   로컬 서버 HTML·CSS 규칙만 확인. 배포 전 실기기 1회 권장.
6. **공개 시각**  
   `publishedAt` 컬럼 없음. public 전환 시 `QuestionAnswer.updatedAt`을 훅으로 사용.

## 배포 순서 (실행 시)

1. 백업: 프로덕션 DB 스냅샷 (Supabase)
2. `prisma migrate deploy` — `20261002120000_question_intake` 포함 (현재 대상 DB는 already up to date)
3. 앱 배포 (Vercel Production) — **아직 하지 말 것 / 이 P8에서 미실행**
4. 스모크: 전시 상세 Ask → admin 전달 → `/q` 답변 → `/my/questions` → public 토글
5. Resend 실메일 1통 확인
6. 문제 시 아래 롤백

## 롤백 절차

**앱만 문제 (스키마 유지 가능)**  
1. Vercel에서 직전 production deployment로 Instant Rollback  
2. Ask UI/API만 비활성되어도 저장·덱·달력은 이전 빌드로 복구

**마이그레이션까지 되돌릴 때 (데이터 손실 위험 — 신중)**  
1. 앱 먼저 롤백  
2. 필요 시 수동 SQL (intake 테이블만 drop; `ArtistQuestion` 등 기존 모델은 유지):

```sql
-- 비상용. 운영 확인 후 실행.
DROP TABLE IF EXISTS "QuestionNotification";
DROP TABLE IF EXISTS "QuestionResponseToken";
DROP TABLE IF EXISTS "QuestionAnswer";
DROP TABLE IF EXISTS "QuestionRecipient";
DROP TABLE IF EXISTS "Question";
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20261002120000_question_intake';
```

3. 또는 DB 스냅샷 복원 (권장)

## 이후 GA4 이벤트 TODO (이번 단계 미구현)

- `question_create` ← `ARTIST_QUESTION_CREATE` + Question row (`status=submitted`)
- `question_deliver` ← admin `ARTIST_QUESTION_MODERATE` + `status=sent`
- `answer_submit` ← `ARTIST_QUESTION_ANSWER` + `QuestionAnswer` create
- `answer_view` ← 질문자 `/my/questions/[id]` 조회 (현재 EventLog 없음 → 추가 지점)
- `answer_publish` ← admin `answerVisibility=public`

전제: 신규 GA4는 별도 작업. domain state(`Question` / `QuestionAnswer.visibility` / EventLog)는 저장 확인됨.

## 재실행 명령

```bash
npx tsx --test src/lib/question-intake.test.ts
npx tsx scripts/smoke-p4-response-token.ts
npx tsx scripts/smoke-p5-asker-loop.ts
npx tsx scripts/smoke-p6-public-qa.ts
npx tsx scripts/smoke-p8-release.ts
npx prisma migrate status
```
