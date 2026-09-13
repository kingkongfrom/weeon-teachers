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

Phase 1 (login + grupos) is implemented. Phase 2 is partial: a rebuilt
**gradebook spreadsheet** on `/grupos/[id]`, submit report, and a reportes
list — not a full reports composer.
The **Aula virtual** is a Google Classroom-style hub. *Novedades* is a stream.
*Trabajo de clase* has an **assessment builder**, **document sharing**,
**turn-in counts** (N de M entregadas + names) once a student submits on
`weeon-mobile`, and **grading**: the assignment's **Entregas** list opens a
grader (answer-key auto-suggestions, per-question points/comments,
**Guardar y devolver**) that writes `grades`, so `/estudiantes/[id]` and the
gradebook update — see [`docs/aula-virtual.md`](docs/aula-virtual.md)
§ Submit vs grade. Needs the `weeon-tenants` classroom migrations listed there.

| Route | Purpose |
| ----- | ------- |
| `/` | School + username login |
| `/crear-contrasena` | First password (also used by the mobile app) |
| `/inicio` | Landing hub with the section cards + weekly schedule |
| `/aula-virtual` | Classes grid (Classroom-style home) |
| `/aula-virtual/[classId]` | Class page — Novedades / Trabajo de clase / Personas / Calificaciones |
| `/aula-virtual/[classId]/evaluaciones/[assessmentId]` | Assessment builder — WYSIWYG, question types, draft/publish |
| `/aula-virtual/[classId]/evaluaciones/[assessmentId]/entregas/[submissionId]` | Grader — student answers, scoring, feedback, return |
| `/grupos` | Grupos this teacher is assigned to (`teaches_class`) |
| `/grupos/[id]` | Gradebook — sticky spreadsheet, typed columns (CW/HW/EXAM…), inline editing, CSV, submit report |
| `/horarios` | Weekly timetable |
| `/estudiantes` | Students in the teacher's groups |
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
