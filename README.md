# Weeon Teachers

Teacher **web** app for Weeon School — desktop workflows that do not belong
in the school ERP or the mobile clients.

Production origin: [https://teachers.weeon.school](https://teachers.weeon.school)
(not deployed yet). Schema and tenancy are owned by
[`weeon-tenants`](https://github.com/kingkongfrom/weeon-tenants). Daily
classroom use stays on
[`weeon-mobile-apps`](https://github.com/kingkongfrom/weeon-mobile-apps).
Workspace map: `../AGENTS.md`.

## Status

Phase 1 (login + grupos) is implemented. Phase 2 is partial: per-materia
gradebook, submit report, and a reportes list — not a full reports composer.

| Route | Purpose |
| ----- | ------- |
| `/` | School + username login |
| `/crear-contrasena` | First password (also used by the mobile app) |
| `/grupos` | Grupos this teacher is assigned to (`teaches_class`) |
| `/grupos/[id]` | Gradebook — materia tabs, evaluations, grades, submit report |
| `/reportes` | Submitted grade snapshots for this teacher |

Admin assigns a username in Comunidad. This app creates the Auth user on
first login, links `teachers.profile_id`, and backfills
`classes.teacher_profile_id` so RLS can show grupos.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase SSR.

```bash
copy .env.example .env.local
# Fill SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# (same project as weeon-tenants; never commit .env.local)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login is username or
email only — the school is resolved from the roster. Demo admin:
`eduardo@weeon.school` (existing ERP password). Demo teacher: `tdocente01`.

```bash
npm run typecheck
npm run lint
npm run build
```

## Working in this repo

1. This is the **teacher web** surface only.
2. Use the shared Supabase project and admin-owned tables — additive schema
   in `weeon-tenants`, safe for Flutter.
3. First password for teachers lives here **and** in `weeon-mobile-apps`,
   not in the school ERP.
4. Align brand with `weeon-tenants` (W-mark, purple→blue gradient).
5. Read `AGENTS.md` and `node_modules/next/dist/docs/` before Next-specific
   code.

Private project — all rights reserved unless otherwise specified.
