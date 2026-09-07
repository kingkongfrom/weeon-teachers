<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Weeon Teachers — Agent Guide

*Teacher **web** surface for Weeon School. Workspace map: `../AGENTS.md`
and `../docs/`.*

## Repo in one line

**weeon-teachers** is the desktop web app for **teachers** (starting with
student reports). It is **not** the school ERP (`weeon-tenants`), **not**
the Flutter app (`weeon-mobile-apps`), and **not** Weeon Ops
(`weeon-management`).

Today this repo is a **UI scaffold**: Dashboard, Reports, Students. No
Auth, no Supabase, no persistence.

## The five repos

| Repo | Role |
| ---- | ---- |
| `weeon-marketing` | Public site + trial |
| `weeon-tenants` | School ERP + **schema owner** (`weeon-tenants/` locally) |
| `weeon-mobile-apps` | Mobile — daily classroom, first password |
| **weeon-teachers** (this repo) | Teacher web — reports / desktop |
| `weeon-management` | Cross-tenant Weeon Ops |

## Non-negotiable rules

1. **Stay a teacher web app.** Do not build school-admin Comunidad,
   billing, backups, marketing pages, or ops dashboards here.
2. **Do not invent a parallel schema.** When wiring data, use the shared
   Supabase project and admin-owned tables (`students`, `classes`,
   `enrollments`, `profiles`, `roster_accounts`, …). Confirm columns in
   `weeon-tenants` `lib/supabase/database.types.ts`. Additive migrations
   only, in **weeon-tenants**.
3. **Tenant isolation.** Every academic row is scoped by `tenant_id`.
   Teachers never see another school.
4. **Daily classroom stays on mobile** unless product explicitly moves a
   slice here. First password for teachers is **weeon-mobile-apps**, not this
   app, until product says otherwise.
5. **Align brand** with admin: Geist, W-mark, gradient `#5e25cc` →
   `#2b59ff`, Spanish school-facing copy. Do not leave the generic “W”
   tile as the final identity.
6. **Never commit secrets.** `.env*` git-ignored; only `.env.example`.
7. **Next.js 16 ≠ training data.** Read `node_modules/next/dist/docs/`.
   Keep the `<!-- BEGIN:nextjs-agent-rules -->` block.

## Stack / layout

- Next.js **16.3.4**, React **19**, Tailwind **v4**, `motion`, `lucide-react`.
- App Router under `src/app/`. Routes: `/`, `/reports`, `/reports/new`,
  `/students`.
- Types only: `src/types/student.ts`, `src/types/report.ts`.

## Must-read before feature work

| Doc | Where |
| --- | ----- |
| Workspace map | `../AGENTS.md`, `../docs/repositories.md` |
| Tenancy | `weeon-tenants/docs/tenancy.md` |
| Live schema / RLS | `weeon-tenants/docs/data-access.md` |
| Usernames / first login | `weeon-tenants/docs/user-provisioning.md` |
| Mobile contracts | `weeon-mobile-apps/plans/weeon-tenants.md` |

Follow the Next.js agent-rules block above: do not remove it from diffs.
