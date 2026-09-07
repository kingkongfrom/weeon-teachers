# Weeon Teachers

Teacher **web** app for Weeon School — desktop workflows (student reports)
that do not belong in the school ERP or the mobile clients.

This is one of **five** Weeon repositories. Schema and tenancy are owned by
[`weeon-tenants`](https://github.com/kingkongfrom/weeon-tenants). Daily classroom
use stays on [`weeon-mobile-apps`](https://github.com/kingkongfrom/weeon-mobile-apps)
(Flutter). Workspace map: `../AGENTS.md`.

## Status

UI scaffold only:

| Route | Purpose |
| ----- | ------- |
| `/` | Dashboard |
| `/reports` | Report list |
| `/reports/new` | New report |
| `/students` | Student list |

No Auth, no Supabase, no persistence yet. Types live in `src/types/`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Working in this repo

1. This is the **teacher web** surface only.
2. When wiring data, use the shared Supabase project and admin-owned
   tables — additive schema in `weeon-tenants`, safe for Flutter.
3. Align brand with `weeon-tenants` (W-mark, purple→blue gradient).
4. Read `AGENTS.md` and `node_modules/next/dist/docs/` before Next-specific
   code.

Private project — all rights reserved unless otherwise specified.
