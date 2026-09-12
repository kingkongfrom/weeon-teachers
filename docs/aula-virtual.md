# Aula Virtual — Google Classroom model (teacher web)

*Design + build reference for the virtual classroom in **weeon-teachers**.
Read with `AGENTS.md` (this repo), `../AGENTS.md` (workspace), and
`../../weeon-tenants/docs/modules.md` § Virtual Classroom.*

## One line

Teachers and students already know **Google Classroom**, so we reproduce its
shape — classes grid → class page with **Novedades / Trabajo de clase /
Personas / Calificaciones** — and then improve on it by **unifying Classwork
with the gradebook** (an assignment *is* a grade column) and keeping
everything MEP- and tenant-aware.

**P1 is implemented: the teacher shares documents with a group.** Groups and
students already come from the admin assignment — the teacher never adds them
here. Exams/homework, native assessments, and editable PDFs come later; see
§ Documents vs assessments and § Build phases.

## Why Classroom

- **Zero learning curve.** The flow is the product. Matching the mental model
  (class cards, stream, classwork, people, grades) means we ship familiarity
  instead of a tutorial.
- **Proven information architecture.** Stream for communication, Classwork for
  work, People for roster, Grades for marks — each has a clear job.
- **But aim higher.** Classroom's biggest friction for teachers is duplication:
  an assignment lives in *Classwork*, its marks live in *Grades*, and a report
  is a third place. Weeon should make one object serve all three.

## Ownership

| Concern | Where |
| --- | ------ |
| Classroom **UI + authoring** (this doc) | `weeon-teachers` |
| **Schema / RLS / Storage**, additive only | `weeon-tenants` |
| Daily consumption (attendance, live classroom, student/parent view) | `weeon-mobile-apps` |
| School structure (classes, subjects, enrollments, staff) | `weeon-tenants` (admin) |

Product decision: authoring of announcements, classwork, and materials moves to
**teacher web**, while mobile keeps the daily-consumption surface. This is an
intentional slice of the "daily classroom stays on mobile" rule in
`weeon-teachers/AGENTS.md`; update that rule when a phase lands.

## What we mirror from Classroom (verbatim names)

Keeping the same labels and order is deliberate — it is the whole point.

| Classroom | Weeon (ES) | Weeon (EN) | Route |
| --- | --- | --- | --- |
| Classes home | Aula virtual | Virtual classroom | `/aula-virtual` |
| Class page | (grupo) | (group) | `/aula-virtual/[classId]` |
| Stream | Novedades | News | tab |
| Classwork | Trabajo de clase | Classwork | tab |
| People | Personas | People | tab |
| Grades | Calificaciones | Grades | tab → gradebook |
| Announcement | Anuncio | Announcement | stream post |
| Assignment | Tarea | Assignment | classwork item |
| Material | Material | Material | classwork item |
| Topic | Tema | Topic | classwork grouping |
| Due date | Fecha de entrega | Due date | assignment field |

## Current state (what is actually built)

Honest snapshot — do not assume the rest exists.

- **`/aula-virtual`** — grid of `ClassCard`s (banner, school + section, subject
  chips, student count, three disabled quick actions). Data from
  `loadTeacherGrupos()` (`classes` + `enrollments` + `subjects`).
- **`/aula-virtual/[classId]`** — class banner + `ClassTabs`:
  - **Novedades** — **stream (P2)**: `StreamPanel` — the teacher posts
    announcements, sees them newest-first with author + relative time, and
    deletes their own.
  - **Trabajo de clase** — **assessments (P5a)** + **materials (P1)**:
    - *Tareas y exámenes*: `AssessmentsPanel` → the `AssessmentEditor`
      (`/aula-virtual/[classId]/evaluaciones/[id]`) builds a homework/exam with a
      TipTap WYSIWYG, question types, a **Materia** selector, preview, and
      draft/publish. **Publishing creates/updates its grade column** (linked via
      `assignments.assessment_id`, typed by the assessment kind), so it shows up
      in the gradebook with no manual column.
    - *Materiales*: `MaterialsPanel` uploads/lists/downloads/removes documents.
    - *Temas*: `ClassworkPanel` — topic chips (Temas) create topics and filter
      assessments + materials; topics are set on the assessment/column and on the
      material upload.
    - *Materias*: when the class has more than one subject, the **subject badges
      live inside Classroom only** and filter its assessments + materials
      (`?subject=<id>&tab=trabajo`); **Novedades / Personas / Calificaciones stay
      class-wide**. New assessments and materials default to the active subject.
      Every class banner uses one shared green gradient with fixed dark-green ink
      (per-subject pastels flipped to white ink in dark mode and lost contrast);
      the active subject rides in a white badge on that banner.
  - **Personas** — teacher row + enrolled students.
  - **Calificaciones** — link into the existing gradebook (`/grupos/[id]`).
- **Gradebook** — `/grupos/[id]`: the `GradebookWorkspace` spreadsheet over
  `assignments` (columns) + `grades` (marks). Sticky student column, typed
  columns (Trabajo/Tarea/Examen/Prueba/Proyecto) with auto labels (`CW 1`,
  `EXAM 1`…), inline keyboard editing + autosave, color-coded cells, per-student
  FINAL and per-column averages, density toggle, CSV export, and undo on delete.
  `assignments.category` groups columns (classwork/evaluation) for weighting.
- No stream comments; student fill/submit (P5b) and auto-grading (P5c) not built yet.

> **Deploy note:** P1 needs `20260911130000_class_materials.sql`, P5a needs
> `20260911150000_assessments.sql`, the typed gradebook needs
> `20260911160000_assignments_assessment_link.sql` +
> `20260911170000_assignments_kind.sql`, the stream needs
> `20260911190000_class_stream.sql`, and topics need
> `20260911200000_classwork_topics.sql`, applied in `weeon-tenants`, then the
> generated Supabase types regenerated. The teacher repo is untyped, so it builds
> without the type refresh, but the migrations are required at runtime.
> (`20260911180000_backup_academic_tables.sql` is the tenants backup change.)

## Target architecture

### Routes

| Route | Purpose |
| --- | --- |
| `/aula-virtual` | Class grid. Create-class stays admin-owned (tenancy); show `Próximamente` until product decides otherwise. |
| `/aula-virtual/[classId]` | Class shell: banner + tabs (Novedades default). |
| `/aula-virtual/[classId]/trabajo` | Classwork: topics, assignments, materials, grades view. |
| `/aula-virtual/[classId]/t/[topicId]` | Classwork filtered to a topic. |
| `/aula-virtual/[classId]/a/[assignmentId]` | Assignment detail: instructions, attachments, student work + grading. |
| `/aula-virtual/[classId]/personas` | Teachers + students (+ co-teachers later). |
| `/aula-virtual/[classId]/calificaciones` | Gradebook (reuses `/grupos/[id]`). |

Today the tabs are client state inside `ClassTabs`. When Classwork needs deep
links (assignment URLs, topic filters), promote the tab ids to **route
segments** so a post can link to `/aula-virtual/[classId]/a/[id]`.

### Components

- `components/classroom/class-card.tsx` — grid card (exists).
- `components/classroom/class-tabs.tsx` — tab shell (exists; grows).
- `components/classroom/stream/*` — composer, post card, comments.
- `components/classroom/classwork/*` — topic list, item row, composer.
- `components/classroom/assignment/*` — detail, submission grid, grading.
- `components/classroom/people/*` — roster.
- Reuse `SubjectChips`, `classBannerClass`, and the pastel tone palette.

## Data model

Existing tables we build on (owned by `weeon-tenants`; confirm columns in
`weeon-tenants/lib/supabase/database.types.ts` before use — some migrations are
ahead of the generated types):

| Table | Role here |
| --- | --- |
| `classes` | The class (group). `teacher_profile_id`, `grade`, `section`, `active`. |
| `class_lessons` | Timetable + subject/teacher link (`teaches_class` scope). |
| `enrollments` | Students in the class. |
| `subjects` | MEP subject catalog (12 rows). |
| `class_materials` | **P1 — shared documents.** One row = one file (`storage_path`, `file_name`, `mime_type`, `size_bytes`). |
| `assignments` | **Classwork item + grade column.** `title`, `description`, `due_date`, `points`, `subject_id`. |
| `grades` | Per `(class, student, assignment)` mark. |
| `submissions` | Already exists (`assignment_id`, `student_id`, `content`, `attachment_url`, `grade`, `feedback`, `submitted_at`) — reuse in P4; do not recreate. |
| `class_reports` | Submitted snapshots (`/reportes`). |

`assignments` today is effectively "exam column" (title, points, due date,
description). It is the natural home for a Classroom **assignment** — this is
the key unification below.

### Migrations (in `weeon-tenants` only)

All `tenant_id`-scoped, additive, and safe for Flutter. **P1 is implemented** in
`supabase/migrations/20260911130000_class_materials.sql`; the rest are proposals
to settle in a `weeon-tenants` ADR/migration before coding.

**P1 — documents (`class_materials`) — implemented.** One row = one file
(multi-file = multiple rows), matching the existing `submissions.attachment_url`
style — no generic attachments table. Columns: `id`, `tenant_id`, `class_id`,
`subject_id` (nullable), `title`, `description`, `storage_path`, `file_name`,
`mime_type`, `size_bytes`, `created_by`, `published`, `position`, `created_at`,
`updated_at`. The migration also adds `public.can_view_class_materials(uuid)`,
member-read / teacher-write RLS, the trial write-gate trigger, and the private
`class-materials` Storage bucket with path-based policies.

**P3 — assignments (extend the existing `assignments` table):**

| Column | Type | Notes |
| --- | --- | --- |
| `subject_id` | uuid | already added by an earlier migration |
| `topic_id` | uuid | → `classwork_topics` |
| `instructions` | text | long body (keep `description` as the short summary) |
| `published` | boolean | draft vs published |
| `published_at` | timestamptz | when posted |
| `created_by` | uuid | author `profiles.id` |
| `updated_at` | timestamptz | touch on edit |

**Later tables (P3+):**

| Table | Key columns |
| --- | --- |
| `classwork_topics` *(implemented, P3 — Temas)* | `id`, `tenant_id`, `class_id`, `name`, `position`, `created_at`, `updated_at`; `assessments.topic_id` and `class_materials.topic_id` (nullable, on delete set null) — migration `20260911200000_classwork_topics.sql` |
| `class_stream_posts` *(implemented, P2 — announcements)* | `id`, `tenant_id`, `class_id`, `author_profile_id`, `kind` (`announcement`), `body`, `created_at`, `updated_at` — migration `20260911190000_class_stream.sql` |
| `class_stream_comments` | `id`, `tenant_id`, `post_id`, `author_profile_id`, `body`, `created_at` |

Reuse the **existing** `submissions` table for turn-in in P4 — do not create a
new one. A generic `attachments` table is **not** planned: each object carries
its own file (`class_materials`) or URL (`submissions.attachment_url`).

**Why a separate `class_materials` (not `assignments.kind = 'material'`).** The
gradebook builds one column per row in `assignments`; mixing non-gradeable
materials into that table would show them as grade columns unless every query
filters by kind. A dedicated table keeps the gradebook untouched and lets
materials have their own fields (position, draft) without polluting grading.

**Storage.** One **private** bucket `class-materials`, path
`{tenant_id}/{class_id}/{material_id}/{filename}`, 25 MiB, MIME allowlist
(PDF, images, Office, text). Downloads use short-lived signed URLs (60s);
storage policies reuse the same `teaches_class` / enrollment checks as the
tables. Never a public bucket. Marks stay in `grades`; `submissions` tracks the
workflow state around a mark.

### RLS (must hold)

- Every table carries `tenant_id`; every read is tenant-scoped.
- **Teachers** may read/write classroom data for classes where
  `public.teaches_class(class_id)` (homeroom `classes.teacher_profile_id` or
  `class_lessons.teacher_id`), matching the existing gradebook policies.
- **School admins** of the tenant may read (and, where appropriate, write) any
  class in their tenant.
- **Students** may read their own class's stream/classwork and write only their
  own `submissions`; **parents** read their child's class (read-only).
- Storage policies key off the same `teaches_class` / enrollment checks.
- Uniqueness stays `(tenant_id, …)` — e.g. one submission per
  `(assignment_id, student_id)`.

## Improvements over Google Classroom

The reason to build our own rather than copy pixel-for-pixel:

1. **Classwork = gradebook.** Creating an assignment creates its grade column
   and its stream post in one step. No drifting between "Trabajo de clase" and
   "Calificaciones".
2. **Reports are downstream, not parallel.** Marks flow into `class_reports`
   and `/reportes` automatically; the teacher never re-types a report.
3. **MEP-native.** Periodos, the `subjects` catalog, and `class_lessons`
   schedules are first-class, not bolted on.
4. **Tenant isolation by default.** RLS is the gate; no ad-hoc sharing links
   that leak across schools.
5. **Spanish-first, mobile-parity.** The same objects render in `weeon-mobile-apps`.
6. **Less baggage.** No Drive/Meet gravity; attachments are optional and Meet
   (if ever) is a link, not a dependency.
7. **One palette, one language.** Classroom's UI is neutral; ours is branded and
   consistent with the panel/schedule (see the tone palette).

## Documents vs assessments (recommendation)

The teacher priority **now** is **sharing documents with a group**. Exams and
homework come later. On the "editable PDF" idea:

- **Ship documents first (P1, done).** Teacher uploads files to a group; students
  view and download. No editing, no grading. Needs only `class_materials` + one
  Storage bucket.
- **Assessments (P5) are native, not PDFs.** Form fields, annotations, and
  flattening are heavy, break on mobile, and cannot be auto-graded. A native
  Weeon form/quiz renders identically on web and mobile, works offline, and
  grades itself — so homework/exams default to native forms.
- **Editable PDFs are a committed requirement (P6), not optional.** We *will*
  need them (e.g. an official form a student must fill). When we build it, use a
  **PDF.js viewer + annotation layer**: store annotations as JSON and export a
  flattened copy. Never hand-roll a PDF editor, and never block P1–P5 on it.

Decision: **documents now → native assessments → editable PDFs (PDF.js) as a
committed later phase.**

## Assessments & the WYSIWYG builder (P5)

Decision: **assessments are native, structured content — not PDFs.** The teacher
builds homeworks/exams in a WYSIWYG block editor; the **definition JSON is the
source of truth**; a PDF is only an export.

- **Editor (teacher web):** title, kind (`homework` | `exam`), instructions,
  due date, and questions.
- **Question types (v1):** multiple choice, multiple answer, true/false, short
  answer, paragraph, number. (Later: matching, file/drawing upload, math.)
- **WYSIWYG:** rich-text prompts/instructions via **TipTap**, stored as a
  ProseMirror **JSON** document and rendered by **our own safe renderer** (no
  raw HTML, so no XSS).
- **Preview = student view:** the author preview and the student renderer are the
  *same component*, so WYSIWYG is guaranteed by construction.
- **Persistence:** one `assessments` row with a `content jsonb` document
  (questions + keys + points). Question ids are **stable uuids inside the JSON**
  so future submissions/answers can reference them.
- **Publishing:** draft → published. Published items reach students (P5b, mobile).
- **Grading (P5c):** objective types auto-score from the answer key; open types
  go to a manual queue; scores flow into the gradebook (Classwork = gradebook).

Schema (additive): **`assessments` only** for P5a. `submission_answers`/grading
arrive with P5b/P5c.

Why JSON, not HTML or PDF: cross-platform (Flutter renders the same model),
XSS-safe, offline-friendly, and free of PDF fidelity/XFA risk.

### Grammar & spelling check (P5a.1)

The rich-text editor has a **"Revisar ortografía" / "Check spelling"** action on
every field (instructions + question prompts).

- **Engine:** **LanguageTool** — deterministic, reproducible, good Spanish.
  Called from a **server action** (`lib/ai/grammar-actions.ts`), so no provider
  URL/key reaches the browser and teacher text is never sent from the client.
- **Language is decoupled from the UI locale.** The check defaults to
  `language=auto` (LanguageTool detects it), with an override (Auto / Español /
  Inglés) next to the toggle — otherwise Spanish text written in an English UI
  was checked as English.
- **UX:** a right-aligned **Sparkles toggle** turns checking on/off; issues show
  as **red wavy underlines** (TipTap decorations) plus a panel with each message,
  suggested replacements, **accept**, **Ignore**, and **Corregir todo / Fix all**
  (applies the top suggestion for every issue in one pass, end→start). While on,
  it re-checks after typing pauses (~1.2s debounce).
- **Privacy:** defaults to the public `api.languagetool.org`. Set
  `LANGUAGETOOL_URL` (and optional `LANGUAGETOOL_API_KEY`) to a **self-hosted**
  instance to keep text on our infra — recommended for a school product.
- Scope: **teacher authoring only**, spelling/grammar only. No AI rewriting and
  no student data (that would raise minors'/Ley 8968 concerns — see P6 notes).

## Grades & evaluation (P5b/P5c + the new gradebook)

The rule: **an assessment is a grade column.** Evaluating once writes the grade —
no second manual entry (the "Classwork = Gradebook" promise, made real).

**Status:** the authoring→gradebook link is **implemented** — publishing an
assessment creates/updates its `assignments` column (subject from the editor's
Materia selector, kind from the assessment type). Student submission (P5b) and the
grading queue (P5c) are still pending.

- **Link, don't duplicate.** `assignments.assessment_id` connects the classwork
  item to its column. Publishing an assessment creates/updates that column.
- **Submissions attach to the column** via the existing `submissions.assignment_id`.
- **The number lives in `grades`** (`mark`, `max_marks`). `submissions` carries the
  workflow (`state`, returned feedback). One source for the number.
- **Grading writes `grades`** atomically (RPC), so the gradebook and `/reportes`
  update with no retyping. Objective questions auto-score from the answer key;
  open answers are manual; the total becomes the column's mark.
- **Student turn-in** is mobile (P5b); the **grading queue** is here (P5c).

### The new Grades interface (replaces the old grid)

Two surfaces, one flow:

1. **"Por evaluar" queue** — every submission across the teacher's groups, with a
   pending count, filtered by group/assessment. Each row opens the grader.
2. **Grader** — the student's answers in view, objective auto-scored, open answers
   scored inline, feedback field, then **Guardar y devolver** → writes `grades`.
   Bulk **Publicar calificaciones** for many at once.
3. **Gradebook matrix** — the overview/adjust surface: students × columns with
   sticky header + student column, inline editing with keyboard navigation
   (Enter/Tab/arrows), live per-student average and per-column average, a
   **FINAL** column, category grouping (Trabajo de clase / Evaluaciones), and CSV
   export.

**Why it beats the WOOT IT grid** (the reference screenshot): modern branded UI
instead of an Excel clone; columns **auto-created from the assessments** the
teacher already authored; the same columns are editable directly (no Excel
round-trip); attendance/reading-time columns are dropped (mobile owns daily
attendance); and grading happens in the context of the student's actual answers.

### Schema additions (additive, `weeon-tenants`)

| Change | Why |
| --- | --- |
| `assignments.assessment_id` (nullable) | Link the assessment to its grade column. |
| `assignments.category` (`classwork` \| `evaluation`) | Group columns for the matrix. |
| `submissions.state`, `returned_at` | Turn-in workflow (P5c). |
| `submission_answers` | Per-question answers + auto-score + feedback. |

Everything else (`grades`, `assignments.points`, `submissions`) already exists.
Weighted category percentages and an `FINAL` policy beyond the column average are
a follow-up (kept simple first: FINAL = mean of column percentages).

## Teacher flows (target)

1. **Open a class** — grid card → class page. Groups and students already come
   from the admin assignment; the teacher never adds them here.
2. **Share a document (P1)** — Trabajo de clase → *Añadir material* → upload
   file(s) + title/description → publish. Students see it on web and mobile.
3. **Announce (P2)** — Novedades composer → post (optional attachments).
4. **Create work (P3)** — *Crear* → Tarea: title, instructions, due date,
   points, topic, **subject**; it creates the grade column.
5. **Grade (P4)** — assignment detail lists students; enter marks (reuses the
   gradebook cell editor); return work with a comment.
6. **Report** — submit the subject report; it appears in `/reportes`.
7. **People** — see the roster; later co-teachers.

## Build phases

| Phase | Scope | Depends on |
| --- | --- | --- |
| **P0** *(done)* | Hub grid, class page, tabs, Personas, gradebook link. | — |
| **P1** *(done)* | **Materials / documents**: upload, list, download, delete per group. | `class_materials`, `class-materials` bucket, `MaterialsPanel` |
| **P2** *(partial)* | Stream announcements **done**; comments pending. | `class_stream_posts` ✓ |
| **P3** | Assignments / homework: topics, authoring, unified with gradebook. | `assignments` columns, `classwork_topics` |
| **P4** | Submissions + grading flow (turn-in state, return + comment). | existing `submissions` table |
| **P5a** *(done)* | **Assessment builder**: WYSIWYG homework/exam authoring + preview. | `assessments` |
| **P5b** | Student fill + autosave + submit (mobile). | `submissions`, `submission_answers` |
| **P5c** | Auto-grading + manual queue → gradebook. | `submission_answers` |
| **P5d** | Question bank, templates, math, drawing/file answers. | — |
| **P6** | **PDF export/import** (printable exam; PDF.js read-only) + optional Meet link. | — |

Ship each phase only after its tables exist in `weeon-tenants` and the generated
types are refreshed in this repo.

## Non-negotiables

1. **No parallel schema.** All new tables/columns go in `weeon-tenants`,
   additive and mobile-safe.
2. **Tenant isolation.** Every row has `tenant_id`; uniqueness is
   `(tenant_id, …)`. Teachers are scoped by `teaches_class`.
3. **Stay a teacher surface.** No school-admin Comunidad, billing, or ops here.
4. **No dead links.** Nothing ships as a clickable control before its schema and
   loaders exist — show an honest empty state or `Próximamente`.
5. **Spanish school-facing copy**, with EN via the i18n catalog.
6. **Brand + palette** from the shared tone system (no new candy colors).

## Open questions

- Can a teacher **create** a class, or does that stay admin-only? (Tenancy says
  admin owns `classes`; leaning admin-only for now, `Próximamente` on the card.)
- Materials: should the teacher be able to tag a **materia** per document? The
  column exists (`subject_id`); the P1 UI does not expose it yet.
- Student turn-in UI: teacher web vs mobile (`P4`).
- Native quiz table shape and auto-grading rules (`P5`).
- Editable-PDF scope: which forms, and whether annotations are per-student
  copies or a shared layer (`P6`).

## References

- Workspace map — `../AGENTS.md`
- Repo guide + routes — `AGENTS.md`, `README.md`
- Schema / RLS / live tables — `../weeon-tenants/docs/data-access.md`,
  `../weeon-tenants/docs/tenancy.md`
- Module catalog — `../weeon-tenants/docs/modules.md` § Virtual Classroom
- Mobile contracts — `../weeon-mobile-apps/plans/weeon-tenants.md`
