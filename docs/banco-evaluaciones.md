# Banco de evaluaciones — reusable exams & homework

*Design for teacher feedback: "I want to create an exam and reuse it in another
group." Written 26 Oct 2026. Status: **design — not built**.*

---

## 1. The request, stated precisely

Teachers author assessments (Tareas, Exámenes, Pareos…) inside one class in
**Aula virtual → Trabajo de clase → Crear → Tarea / Examen**. Every assessment
belongs to exactly that class:

```
assessments.class_id uuid not null references classes(id) on delete cascade
```

So an exam built for **1B · Ciencias** cannot appear in **2A · Ciencias**. If a
teacher wants the same 10-question quiz in three groups, they author it three
times. That is the pain.

**What "reusable" must mean** (the part worth getting right):

| Requirement | Why |
| ----------- | --- |
| Author once, assign to **many groups** (now or later) | This is the whole request |
| Each group keeps its **own copy**, its own due date, its own submissions, its own grades | A 2A student's answers must never leak into 1B. Results are never shared. |
| Editing the source later must **not silently change** an assigned copy | A group mid-exam must not have its questions rewritten under it. Publishing is a promise. |
| The gradeboard column must land in the **right rubro** | Already a wart today (§5): a published exam always lands in the *first* rubro, so an Exam can end up inside **Tareas**. |
| Find things later without remembering the group | "My exams" is a library, not a class page |

---

## 2. What exists today (baseline)

| Piece | Where | Shape |
| ----- | ----- | ----- |
| Assessment | `assessments` | `class_id`, `subject_id`, `kind ('homework'\|'exam')`, `instructions` (ProseMirror JSON), `content` (`{questions:[…]}`), `due_at`, `points_total`, `published` |
| Grade column | `assignments` (+ `assessment_id`, `category`) | One column per assessment, created **on publish** |
| Rubro assignment | `assignments.rubro_id` | Currently **first active rubro** of the class+subject (`assessments-actions.ts` §`syncGradeColumn`) |
| Submissions | `assessment_submissions` | Per assessment, per student |
| Builder | `/aula-virtual/[classId]/evaluaciones/[assessmentId]` | WYSIWYG, 6 question types + Pareo |
| Listing | `Trabajo de clase` panel | Per class, per subject |

Two structural consequences:

1. **The assessment row is the content *and* the placement.** `class_id`,
   `due_at` and `published` are placement facts bolted onto the content row.
   That is why reuse is impossible without copying.
2. **`content` is already a self-contained JSON document.** Copying it is cheap
   and lossless — no question tables to walk, no foreign keys from questions.

That second point is what makes this feature tractable: the definition is
already portable.

---

## 3. Design

### 3.1 Model: separate the **template** from the **assignment**

```
                    ┌──────────────────────┐
                    │  assessment_templates│  the library (reusable)
                    │  ─────────────────── │
                    │  id                  │
                    │  tenant_id           │
                    │  owner_id            │  teacher who authored it
                    │  collection_id   ────┼──► collections
                    │  title               │
                    │  kind                │
                    │  subject_id          │  what it teaches (not a class)
                    │  grade_level         │  "8°" — for filtering only
                    │  instructions        │  ProseMirror JSON
                    │  content             │  { questions: [...] }
                    │  points_total        │
                    │  archived            │
                    └──────────────────────┘
                              │
                              │  "Usar en un grupo" → copies content into
                              ▼
                    ┌──────────────────────┐
                    │  assessments         │  the per-class instance (today)
                    │  template_id     ────┼──► back-reference, nullable
                    │  class_id            │
                    │  due_at, published   │  placement
                    │  content (copy)      │  snapshot — never auto-synced
                    └──────────────────────┘
```

**Rule: the assignment owns a *copy*, not a pointer.** Editing a template never
mutates an already-assigned assessment. To pull template changes into a group
the teacher uses **Actualizar desde la plantilla**, which is allowed only while
the assessment is a draft or has **zero submissions** — the same guard the
gradebook uses for freezing points after the first grade.

Alternative considered and rejected: a single `assessments` row with
`class_id = null` meaning "library", joined to groups through a
`assessment_assignments(class_id, assessment_id)` table. It avoids a copy, but
every existing query, RLS policy, submission FK and the mobile renderer would
need to resolve "content from assignment, placement from join". The copy is
~2 KB of JSON per group; correctness is worth more than the deduplication.

### 3.2 Collections

A **collection** is the teacher's folder: `Matemática — Fracciones 8°`,
`Repaso final`, etc.

```
collections (
  id, tenant_id, owner_id, name, color, position, created_at
)
```

- **Personal by tenant, not by class.** A teacher's collections follow them
  across groups, which is the point.
- Optional: an assessment can live outside a collection (`collection_id null`,
  shown under **Sin colección**). Do not force a filing decision at creation.
- Filtering by **Materia** and **Nivel** (grade level) matters more than folders
  in practice — teachers remember "the fractions exam for 8th", not the folder
  name. Both are offered; collections are the primary axis.

### 3.3 Reusing: the flow

```
Aula virtual → Trabajo de clase → Crear
  ├── Tarea        (blank, as today)
  ├── Examen       (blank, as today)
  └── Desde el banco…        ← new
        └── drawer: search + filter (Materia · Nivel · Colección)
              └── "Usar en esta clase"
                    ├── copies content into a new draft assessment here
                    ├── picks subject from the assessment (or the class)
                    └── opens the builder to set due date
```

And the reverse, which is the piece that makes the library grow without extra
work:

```
Assessment builder (⋯ menu)
  └── "Guardar en el banco"   ← publishes the current definition as a template
        └── choose/create collection → template created
```

**One draft per group per use.** Using the same template twice in one class is
allowed (two copies, e.g. a retake with different due dates); the UI warns
"Ya usaste esta plantilla en este grupo el 12 oct" rather than blocking.

### 3.4 Rubro targeting (the second half of the request)

The gradeboard column must land in the right rubro. Today it takes the **first**
active rubro, so an Examen can land inside Tareas and quietly change the final.

Fix: resolve the rubro **by kind first, then by name, then ask**.

```
rubroFor(kind, rubros):
  1. rubro whose name matches the kind ("Exámenes" for exam,
     "Tareas"/"Trabajos" for homework), case/accent-insensitive
  2. else rubro at the position the wizard assigned to that kind
     (store it: grade_rubros.default_kind text null)
  3. else → the column is created UNASSIGNED and the gradebook shows it
     under "Sin rubro" with a one-click "Mover al rubro" (already built)
```

Add `grade_rubros.default_kind` (nullable, `'homework' | 'exam'`) set by the
first-run wizard and editable in the rubric editor. Then both the Aula virtual
publish path and the gradeboard's own "Agregar columna" use the same resolver.

**Never silently choose a wrong rubro.** If step 1 and 2 both fail, the column
lands unassigned (visible, harmless) instead of inside an arbitrary rubro.

The template also carries a **suggested rubro kind**, so "Usar en esta clase"
proposes the destination without asking twice:

```
Bank assessment (exam) + target class rubros (Tareas 25, Exámenes 40)
  → "Se guardará en Exámenes (40%)"            [Cambiar]
```

### 3.5 Schema (additive, `weeon-tenants` only)

```sql
-- 1. Collections
create table public.assessment_collections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Templates
create table public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid references public.assessment_collections (id) on delete set null,
  title text not null default '',
  kind text not null default 'homework',
  subject_id uuid references public.subjects (id) on delete set null,
  grade_level text,
  instructions jsonb,
  content jsonb not null default '{"questions":[]}'::jsonb,
  points_total numeric not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_templates_kind_check check (kind in ('homework', 'exam'))
);

-- 3. Back-reference from the per-class instance
alter table public.assessments
  add column if not exists template_id uuid
    references public.assessment_templates (id) on delete set null;

-- 4. Rubro routing hint
alter table public.grade_rubros
  add column if not exists default_kind text;

alter table public.grade_rubros
  add constraint grade_rubros_default_kind_check
  check (default_kind is null or default_kind in ('homework', 'exam'));
```

RLS: templates and collections are **owner-scoped**, tenant-gated —
`owner_id = auth.uid() and tenant_id = jwt_tenant_id()`, with admin read for
the school (so a coordinator can see what exists, but does not edit another
teacher's library). Trial read-only trigger as on `assessments`.

Deliberate choice: **no school-wide shared library in v1.** Teachers asked for
*their own* reuse. Sharing raises moderation and versioning questions that do
not need answering yet; the schema leaves room (`owner_id` → nullable or a
`shared` flag) if the school asks.

### 3.6 Copy semantics (write it down once)

| Field | On "Usar en esta clase" |
| ----- | ----------------------- |
| `title`, `kind`, `instructions`, `content`, `points_total` | **copied** |
| `subject_id` | copied; falls back to the class's subject |
| `template_id` | set (provenance) |
| `class_id` | the target |
| `due_at` | **cleared** — a date only makes sense per group |
| `published` | **false** (draft) |
| `position` | last in the class list |
| submissions | none |

Submissions and grades **never** travel. That is the isolation rule this repo
lives by.

---

## 4. UX

### 4.1 Where the library lives

Two entrances, one page:

- **`/aula-virtual/banco`** — "Banco de evaluaciones": top-level section, next
  to Aula virtual and Comunicación. Grid of collection sections, each holding
  its templates as cards (kind chip, questions, points, used-in count).
- **Inside a class**, **Crear → Desde el banco…** opens the same list in a
  drawer, filtered to the class's subject, with **Usar en esta clase** on each
  card.

A template card:

```
┌─────────────────────────────────────────────┐
│ [EXAMEN]                          ⋯ menu   │
│ Fracciones — evaluación 1                    │
│ 12 preguntas · 40 puntos                     │
│ Matemática · 8°                              │
│ Usado en 3 grupos                            │
└─────────────────────────────────────────────┘
```

⋯ menu: **Ver contenido** · **Duplicar** · **Guardar en una colección** ·
**Archivar**.

### 4.2 Retention and preview

- **Preview reuses the existing student view** (`assessment-preview.tsx`), so
  what a teacher previews is exactly what a group will see.
- Cards show **"Usado en N grupos"**; the detail lists which groups and when.
  Without this a teacher keeps re-creating duplicates because they cannot
  remember what they already have.

### 4.3 Empty states

- No templates: *"Todavía no hay evaluaciones guardadas. Cree una y use
  **Guardar en el banco** desde el editor."* + a primary **Crear evaluación**.
- Search with no results: *"Ninguna evaluación coincide. Pruebe otra materia o
  colección."*

---

## 5. Risks

| Risk | Mitigation |
| ---- | ---------- |
| **Stale copies.** Teacher fixes a typo in the template, groups keep the typo. | "Usado en N grupos" on the template; **Actualizar desde la plantilla** in each draft (only before submissions). Show a diff-free notice: *"La plantilla cambió el 20 oct"*. |
| **Copy sprawl.** Same exam used 6 times, 6 divergent versions. | Version stamp `template_updated_at` vs `assessment.template_version`; a badge marks divergent copies. |
| **Hidden gradeboard impact.** A reused exam creates a column; a careless rubro would move FINAL. | §3.4 resolver + the unassigned fallback. Never guess. |
| **Questions contain answers.** `content` holds `answerKey`; copying must preserve it (it does) but a preview must not leak it to students. | Preview already strips answers for the student view. Template detail is teacher-only via RLS. |
| **Deleting a template.** | `on delete set null` on `template_id`: assigned copies survive, lose provenance. Deleting a collection never deletes templates (`set null`). |

---

## 6. Acceptance criteria

- [ ] Author an exam in 1B, **Guardar en el banco**, use it in 2A → 2A has its
      own draft with identical questions; editing 2A does not change 1B.
- [ ] Publish the 2A copy → the gradeboard gets a column **in Exámenes**, not in
      the first rubro.
- [ ] If the class has no rubro for the kind, the column appears under
      **Sin rubro** and can be moved with one click — nothing is silently
      mis-weighted.
- [ ] Editing the template after 2A published leaves 2A untouched.
- [ ] Due date is empty on the copy; submissions and grades never cross groups.
- [ ] A second teacher in the same school cannot see or edit the first's
      collections.
- [ ] Deleting a template leaves the assigned groups intact.
- [ ] Building the gradeboard with "Agregar columna" uses the same rubro
      resolver.

---

## 7. Phases

| Phase | Scope | Ships independently |
| ----- | ----- | ------------------- |
| **B1 — Rubro routing** | `grade_rubros.default_kind`, the resolver, wizard sets it, publish path uses it | **Yes — and do this first.** It fixes a live bug (exams landing in Tareas) without any new UI. |
| **B2 — Save to bank** | Tables, RLS, "Guardar en el banco" in the builder, `/aula-virtual/banco` listing | Yes |
| **B3 — Use in a class** | "Desde el banco…" drawer in the class page, copy semantics, rubro proposal | Yes |
| **B4 — Collections & filters** | Collections CRUD, subject/level filters, "Usado en N grupos" | Yes |
| **B5 — Sync from template** | Divergence badge, "Actualizar desde la plantilla" | Yes |

**B1 before the rest.** The rubro bug would otherwise get reproduced into every
reused assessment.

---

## 8. Decisions to confirm (plain answers, not a tool)

1. **Personal library vs school-wide.** I propose personal (each teacher's own),
   visible across their groups. A school-wide shared bank is a later decision.
   → *Is that acceptable, or should a coordinator curate questions for the whole
   school from day one?*
2. **Copies vs shared live.** I propose copies (isolation, safe editing). The
   cost is that fixes do not propagate automatically.
   → *Agreed, or do you want one live document behind all groups?*
3. **Does "reusable" include *movement*?** I have designed **copy to another
   group**, not *move* an existing published exam out of a group (which would
   move its grades). → *Is moving ever needed?*
4. **Grade levels.** `grade_level` on a template is free text for filtering. If
   the school wants "8° fracciones" to be found by every 8th-grade teacher, that
   pushes toward a school-shared bank (decision 1).

---

## See also

- [`aula-virtual.md`](aula-virtual.md) § Assessments & the WYSIWYG builder
- [`calificaciones-rubros.md`](calificaciones-rubros.md) § 3 Calculation rules
- [`grupos.md`](grupos.md) — the gradeboard
