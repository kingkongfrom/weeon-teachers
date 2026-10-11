# Teacher web end-to-end journeys (Playwright)

Journeys from [`docs/testing.md`](../../../docs/testing.md) §7, tracked as **QA-6**.

The **public smoke** test always runs. The **authenticated** journeys are
skipped unless credentials are provided, so CI stays green without a seeded
stack.

## Run

```powershell
npm run test:e2e
```

The config starts `next dev` on port 3300 unless `E2E_BASE_URL` is set.

## Environment

| Variable | Purpose |
| -------- | ------- |
| `E2E_BASE_URL` | Base URL of a running teacher app (skips the dev server) |
| `E2E_TEACHER_USERNAME` / `E2E_TEACHER_PASSWORD` | Seeded teacher for journeys 2–4 |
| `E2E_CLASS_ID` | A group id the seeded teacher owns (gradebook + attendance) |
| `E2E_MESSAGE_SEND=1` | Enable the full send-message assertion (needs a contact) |

`E2E_TEACHER_USERNAME` may be the teacher's username or email; the app resolves
the school from the roster. **Never point these at production.**

## Vercel preview

Set `E2E_BASE_URL` to the teacher-web **Preview** deployment URL. Runbook:
[`docs/e2e-preview-stack.md`](../../../docs/e2e-preview-stack.md).
