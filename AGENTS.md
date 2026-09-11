<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Weeon Teachers — Agent Guide

*Teacher **web** surface for Weeon School. Workspace map: `../AGENTS.md`
and `../docs/`.*

## Repo in one line

**weeon-teachers** is the desktop web app for **teachers**. Production origin:
`https://teachers.weeon.school`. It is **not** the school ERP (`weeon-tenants`),
**not** the Flutter app (`weeon-mobile-apps`), and **not** Weeon Ops
(`weeon-management`).

Phase 1 is wired: username or email login, first password (same Auth user as
mobile), lazy Auth provision, and grupos isolated by RLS (`teaches_class`).
Post-login lands on the **`/inicio` landing** (card hub), from which every
section is opened. Phase 2 is **partial**: `/grupos/[id]` was rebuilt as a
**gradebook spreadsheet** — sticky student column, typed columns
(Trabajo / Tarea / Examen / Prueba / Proyecto) with auto labels (`CW 1`,
`EXAM 1`…), inline keyboard editing + autosave, per-student FINAL and
per-column averages, density toggle and CSV export — plus submit report and
`/reportes` to list submitted snapshots.
**Aula virtual** is a Google Classroom-style hub (`/aula-virtual` +
`/aula-virtual/[classId]`): classes grid, stream/classwork tabs, people, and a
gradebook link. Built: **P1 documents** (`class_materials` + private
`class-materials` bucket, `MaterialsPanel`) and **P5a assessment builder**
(`assessments`; TipTap WYSIWYG homework/exam editor at
`/aula-virtual/[classId]/evaluaciones/[id]`). The stream is still an empty state;
student fill/submit (P5b) and auto-grading (P5c) are pending. Read
`docs/aula-virtual.md` before touching it — P1 needs
`20260911130000_class_materials.sql` and P5a needs
`20260911150000_assessments.sql` in `weeon-tenants`. Not built: full reports
composer or parity with mobile daily classroom.

## The five repos

| Repo | Role |
| ---- | ---- |
| `weeon-marketing` | Public site + trial |
| `weeon-tenants` | School ERP + **schema owner** (`weeon-tenants/` locally) |
| `weeon-mobile-apps` | Mobile — daily classroom; first password for all roster roles |
| **weeon-teachers** (this repo) | Teacher web — login, grupos, later reports |
| `weeon-management` | Cross-tenant Weeon Ops |

## Non-negotiable rules

1. **Stay a teacher web app.** Do not build school-admin Comunidad,
   billing, backups, marketing pages, or ops dashboards here.
2. **Do not invent a parallel schema.** Use the shared Supabase project and
   admin-owned tables (`students`, `classes`, `enrollments`, `profiles`,
   `roster_accounts`, …). Confirm columns in `weeon-tenants`
   `lib/supabase/database.types.ts`. Additive migrations only, in
   **weeon-tenants**.
3. **Tenant isolation.** Every academic row is scoped by `tenant_id`.
   Teachers never see another school. Grupos are further limited by
   `teaches_class` (homeroom `classes.teacher_profile_id` or
   `class_lessons` → `teachers.profile_id`).
4. **First password is shared.** Teachers set it here **or** in
   `weeon-mobile-apps`. Same `auth.users` row. Do **not** build first-password
   UI in `weeon-tenants`. Daily classroom (attendance, live grades, notices)
   stays on mobile unless product moves a slice here.
5. **Align brand** with admin: Geist, W-mark, gradient `#5e25cc` →
   `#2b59ff`, Spanish school-facing copy.
6. **Never commit secrets.** `.env*` git-ignored; only `.env.example`.
   Service-role is server-only (username lookup + Auth create).
7. **Next.js 16 ≠ training data.** Read `node_modules/next/dist/docs/`.
   Keep the `<!-- BEGIN:nextjs-agent-rules -->` block. Use `proxy.ts`, not
   `middleware.ts`.

## Stack / layout

- Next.js **16.3.4**, React **19**, Tailwind **v4**, `motion`, `lucide-react`,
  `@supabase/ssr`, Zod.
- App Router under `src/app/`. Routes: `/` (login), `/crear-contrasena`,
  `/inicio` (landing / hub with cards), `/aula-virtual` (virtual classroom
  section), `/aula-virtual/[classId]` (class workspace), `/grupos`,
  `/grupos/[id]` (gradebook), `/horarios`, `/estudiantes`, `/reportes`.
  **Aula virtual mirrors Google Classroom** (classes grid → Novedades /
  Trabajo de clase / Personas / Calificaciones); the target design, schema, and
  phases live in [`docs/aula-virtual.md`](docs/aula-virtual.md).
  **Navigation is a landing + cards, not a dashboard/sidebar.** `AppShell`
  renders a single top bar with only the brand lockup pinned upper-left (links
  back to `/inicio`) and the account controls; the per-screen back link lives
  with the page heading via `PageHeader` / `BackLink`
  (`components/layout/page-header.tsx`), so the app navigates like a mobile app.
  There is no sidebar anywhere.
- Auth: `src/lib/auth/`, `src/lib/supabase/`, `proxy.ts`.
- Session gate: cookie client for reads; service-role only to resolve
  username / email and create/link Auth.

## Login contract

1. Teacher enters **username or email only**. The school comes from
   `roster_accounts` / `profiles` (`tenant_id`). Do not ask for Código SABER.
   An existing school admin or teacher may use their real email and current
   password — do **not** rewrite that profile to `teacher`.
2. Server looks up `profiles` (email) or `roster_accounts` (`role = teacher`).
   Unknown user → one generic error. Same username in two tenants → ask for
   email. Do not leak role.
3. If no `auth_user_id`, create Auth (`email_confirm`, `user_metadata.tenant_id`
   required by `handle_new_user`) with synthetic
   `{username}@{slug}.accounts.weeon.school` unless a real email exists.
4. Link `roster_accounts.auth_user_id`, upsert `profiles`, set
   `teachers.profile_id`, backfill `classes.teacher_profile_id`.
5. `pending_first_login` → sign in with a temp password → `/crear-contrasena`.
   `active` → ask for the password they already set.

Demo tenant: WEEON DEMO SCHOOL, SABER `999999-00`.

## Must-read before feature work

| Doc | Where |
| --- | ----- |
| Workspace map | `../AGENTS.md`, `../docs/repositories.md` |
| **Aula virtual (Classroom model)** | `docs/aula-virtual.md` |
| Tenancy | `weeon-tenants/docs/tenancy.md` |
| Live schema / RLS | `weeon-tenants/docs/data-access.md` |
| Usernames / first login | `weeon-tenants/docs/user-provisioning.md` |
| Mobile contracts | `weeon-mobile-apps/plans/weeon-tenants.md` |

Follow the Next.js agent-rules block above: do not remove it from diffs.
