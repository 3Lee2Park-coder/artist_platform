# Ops (soft launch)

| 문서 | 용도 |
|------|------|
| [ARTIST_OPS_SHEET.csv](./ARTIST_OPS_SHEET.csv) | 작가 segment·URL·회신·이관 추적 (Google Sheet로 복사해도 됨) |
| [OUTREACH_DOR.md](./OUTREACH_DOR.md) | 아웃리치 DoR / 긍정 작가 DoD |
| [DEPLOY_SMOKE_CHECKLIST.md](./DEPLOY_SMOKE_CHECKLIST.md) | Vercel env · migrate · Resend · 이관 리허설 |

이관 CLI:

```bash
npm run ops:transfer-rehearse -- --email artist@example.com --space-id <id> --dry-run
```
