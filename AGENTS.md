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
per-column averages, density toggle and CSV export — plus **report composer**
(`/grupos/[id]/reporte` from **Subir reporte**; snapshots grades + conduct +
asistencia with expandable detail logs) and `/reportes` to list submitted
reports. See `docs/reportes.md`. **Asistencia** is the middle tab on `/grupos/[id]` (`?tab=asistencia`): read-only
TJ/TI history from `attendance_records` with a link to take attendance in aula
virtual — see `docs/asistencia-grupos.md`. **Código de conducta** is the third
tab (`?tab=conducta`): méritos/faltas log + per-student summary, separate from
the grade spreadsheet (`conduct_records`, migration
`20260915100000_conduct_records.sql`; see `docs/conducta.md`). **Apoyos
Eduativos (v1)** — Grupos badge + read-ack dialog before grades/conduct;
read-only panel on `/estudiantes/[id]`; migration
`20260916100000_student_educational_supports.sql` — see
`docs/educational-supports.md` (Tier B period registro designed in
`weeon-tenants`). **Asistencia
(Libro de clase)** remains in aula virtual: a dated register over the shared
`attendance_records` table (P / TJ / TI / AJ / A) reached from a lesson card or
the Grupos Asistencia tab, with a read-only **Asistencia** column in the
gradebook. **Students** live in the aula virtual **Personas** tab
(per group) and in the gradebook rows; selecting one opens `/estudiantes/[id]`, a
per-student **transcript** across every subject the teacher teaches.
**Aula virtual** is a Google Classroom-style hub (`/aula-virtual` +
`/aula-virtual/[classId]`): classes grid, stream/classwork tabs, people, and a
gradebook link. Built: **P1 documents** (`class_materials` + private
`class-materials` bucket, `MaterialsPanel`), **P2 stream** (`class_stream_posts`,
`StreamPanel` announcements), **P3 topics** (`classwork_topics`, `ClassworkPanel`
Temas), and **P5a assessment builder** (`assessments`;
TipTap WYSIWYG homework/exam editor at
`/aula-virtual/[classId]/evaluaciones/[id]`; publishing creates its grade column).
**P5b** student fill/submit is on `weeon-mobile`; this portal shows **N de M
entregadas** and names on the Trabajo de clase card. **P5c teacher grading is
built per assessment:** the assignment **Entregas** list opens a grader
(`/aula-virtual/[classId]/evaluaciones/[assessmentId]/entregas/[submissionId]`)
with answer-key auto-suggestions, per-question points/comments, and **Guardar y
devolver** → writes `grades`, so the student transcript and gradebook update.
**P2.1 stream comments** are built (any class member comments on a Novidad;
author/teacher/admin deletes), and so is the cross-group **"Por evaluar" inbox**
(`/aula-virtual/por-evaluar`, from a banner on `/aula-virtual`).
Read `docs/aula-virtual.md` (especially § Submit vs grade) before touching it —
the aula virtual needs
`20260911130000_class_materials.sql`, `20260911150000_assessments.sql`,
`20260911160000_assignments_assessment_link.sql`,
`20260911170000_assignments_kind.sql`, `20260911190000_class_stream.sql`,
`20260911200000_classwork_topics.sql`,
`20260912180000_attendance_ausencias.sql`,
`20260912220000_assessment_submissions.sql`, and
`20260912230000_teacher_sees_submissions.sql`, `20260913000000_assessment_grading.sql`,
and comments need `20260913150000_class_stream_comments.sql` in `weeon-tenants`.
**Comunicación is built** (`/comunicacion`) as a hub with two channels:
**Mensajes** — school mail (subject + TipTap rich body +
**drag-&-drop attachments**, optional replies) to hand-picked parents or a
group's guardians, at `/comunicacion/mensajes`; schema `threads`/`messages`/`thread_recipients`/
`message_attachments` (migrations `20260913160000_messaging.sql` +
`20260913170000_message_attachments.sql`). **Chat** — realtime 1:1 teacher ↔
guardian (guardians only), iMessage-style at `/comunicacion/chat`; schema
`chat_conversations`/`chat_messages` + RPCs, migration `20260914050000_chat.sql`
(the shared `list_message_contacts()` becomes admin-aware in
`20260914060000_message_contacts_admin.sql`). See
[`docs/comunicacion.md`](docs/comunicacion.md).
Cc/drafts and extended parent/student surfaces are follow-ups (Chat
already ships teacher web + parent mobile).

## Teacher mobile (weeon-mobile) — extension, not a fork

Teachers also sign in on **`weeon-mobile`** (Expo). That portal is a **field
companion** to this web app: attendance on the floor, chat with guardians,
quick messages, schedule/calendar, gallery, push — **not** a second gradebook or
assessment studio.

**Agents:** read [`docs/teacher-mobile-extension.md`](docs/teacher-mobile-extension.md)
and [`../weeon-mobile/docs/teacher-mobile.md`](../weeon-mobile/docs/teacher-mobile.md)
before scoping teacher mobile work. Shared contracts (attendance, chat, mail,
calendar) must stay aligned with this repo's loaders and RPCs.

## The five repos

| Repo | Role |
| ---- | ---- |
| `weeon-marketing` | Public site + trial |
| `weeon-tenants` | School ERP + **schema owner** (`weeon-tenants/` locally) |
| **`weeon-mobile`** | Mobile — student/parent daily app + **teacher field companion** |
| **weeon-teachers** (this repo) | Teacher **web** — authoring, gradebook, aula virtual |
| `weeon-management` | Cross-tenant Weeon Ops |

## Non-negotiable rules

1. **Stay a teacher web app.** Do not build school-admin Comunidad,
   billing, backups, marketing pages, or ops dashboards here.
2. **Do not invent a parallel schema.** Use the shared Supabase project and
   admin-owned tables (`students`, `classes`, `enrollments`, `profiles`,
   `roster_accounts`, …). Confirm columns in `weeon-tenants`
   `lib/supabase/database.types.ts`. Additive migrations only, in
   **weeon-tenants**.
3. **Tenant isolation and assignment segregation.** Every academic row is
   scoped by `tenant_id`. Teachers never see another school. Grupos are further
   limited by `teaches_class` (homeroom `classes.teacher_profile_id` or
   `class_lessons.teacher_id`). **Horarios / schedule widgets** must filter to
   assigned slots only (`loadTeacherSchedule` → `teacher_id IN
   teacher_roster_ids()`), not every period RLS returns for a grupo. See
   `docs/agenda.md` § Horarios — assignment scope.
4. **First password is shared.** Teachers set it here **or** in
   **`weeon-mobile`**. Same `auth.users` row. Do **not** build first-password
   UI in `weeon-tenants`. Student/parent consumption stays on mobile; teacher
   **authoring** stays here. **Attendance (Libro de clase)** is built on web
   first; teacher **mobile** will complement it for on-the-go marking (see
   `docs/teacher-mobile-extension.md`). Student **Entregar** is student mobile
   only.
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
  `/inicio` (landing / hub — 2×2 module cards + today schedule widget; see
  `docs/inicio.md`), `/agenda` (hub: Horarios + Próximos
  eventos + Calendario), `/agenda/eventos` (read-only upcoming institution
  events), `/agenda/calendario` (month/week/day/agenda calendar mirroring the
  ERP, `?view=month|week|day|agenda&date=YYYY-MM-DD`),
  `/aula-virtual` (virtual classroom section),
  `/aula-virtual/[classId]` (class workspace), `/aula-virtual/por-evaluar`
  (cross-group grading inbox), `/comunicacion` (hub: Mensajes + Chat cards),
  `/comunicacion/mensajes` (message list), `/comunicacion/nuevo` (compose message),
  `/comunicacion/mensajes/[threadId]` (thread detail), `/comunicacion/chat`
  (realtime guardian chat), `/comunicacion/chat/[conversationId]`,
  `/grupos`, `/grupos/[id]` (Calificaciones + `?tab=asistencia` + `?tab=conducta`;
  see `docs/grupos.md`),
  `/horarios?week=` (weekly timetable, paged; add an
  exam/activity from a class tile), `/estudiantes/[id]` (per-student transcript — reached from aula virtual
  **Personas** or the gradebook; there is no standalone students section),
  `/reportes`.
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
| **Agenda (schedule, upcoming events)** | `docs/agenda.md` |
| **Comunicación (messaging)** | `docs/comunicacion.md` |
| **Mis grupos (Calificaciones / Asistencia / Conducta)** | `docs/grupos.md` |
| **Asistencia tab (Grupos)** | `docs/asistencia-grupos.md` |
| **Código de conducta** | `docs/conducta.md` |
| **Apoyos Eduativos** | `docs/educational-supports.md` (+ canonical `weeon-tenants/docs/educational-supports.md`) |
| Student Entregar (Expo) | `../weeon-mobile/docs/aula-virtual.md` |
| **Teacher mobile (web extension)** | `docs/teacher-mobile-extension.md`, `../weeon-mobile/docs/teacher-mobile.md` |
| Tenancy | `weeon-tenants/docs/tenancy.md` |
| Live schema / RLS | `weeon-tenants/docs/data-access.md` |
| Usernames / first login | `weeon-tenants/docs/user-provisioning.md` |
| Mobile contracts | `weeon-mobile-apps/plans/weeon-tenants.md` |

Follow the Next.js agent-rules block above: do not remove it from diffs.
