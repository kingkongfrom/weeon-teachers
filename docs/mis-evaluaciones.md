# Mis evaluaciones — reusable exams & homework

*Teacher feedback: "I want to create an exam and reuse it in another group."
Written 26 Oct 2026, revised the same day after the owner's decisions.*

**Status: phases B1–B5 built (26 Oct 2026).** B6 (pull library changes into an
existing draft) ships as updateAssessmentFromLibrary but has no UI entry yet.
What exists:

| Piece | Where |
| ----- | ----- |
| Rubro routing by kind (B1) | lib/dashboard/rubro-routing.ts + migrations 20261026150000, 20261026151000 |
| Library tables + RLS (B2) | weeon-tenants/supabase/migrations/20261026160000_exam_library.sql |
| Pure helpers + tests | lib/assessments/library.ts (+ library.test.ts, 29 tests) |
| Loaders | lib/dashboard/library.ts, library-options.ts |
| Actions | lib/teachers/library-actions.ts, library-picker-actions.ts, library-client-actions.ts |
| Library page (Mías / Compartidas) | /aula-virtual/mis-evaluaciones + components/library/ |
| Save from the builder | **Guardar en mis evaluaciones** in `assessment-editor.tsx` |
| Use in a class (B3) | **Crear → Desde mis evaluaciones…** in `assessments-panel.tsx` |
| Share with a teacher (B5) | Share dialog on the library card |
| Item preview | /aula-virtual/mis-evaluaciones/[id] (student view, answers stripped) |

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

**What "reusable" must mean:**

| Requirement | Why |
| ----------- | --- |
| Author once, assign to **many groups** (now or later) | This is the whole request |
| Each group keeps its **own copy**, due date, submissions and grades | A 2A student's answers must never leak into 1B |
| Editing the source later must **not silently change** an assigned copy | A group mid-exam must not have questions rewritten under it |
| The gradeboard column must land in the **right rubro** | Live bug today (§3.5): a published exam always lands in the *first* rubro, so an Exam can end up inside **Tareas** |
| A teacher can **share** a copy with a colleague, explicitly | Teams reuse the same quiz; sharing must be an act, not a default |
| Find things later without remembering the group | The library is where teachers look |

---

## 2. Decisions (owner, 26 Oct 2026)

1. **Personal library, shared on purpose.** Every teacher has their own
   **Mis evaluaciones**. Sharing to other teachers is an explicit action per
   item — nothing is visible to colleagues by default. School-wide curation by a
   coordinator is not part of v1, but the schema supports it later by adding a
   share target, not a rewrite.
2. **Not called "banco".** The feature name in the UI is **Mis evaluaciones**;
   the nav entry sits under Aula virtual as **Mis evaluaciones**. Collections
   inside it are **colecciones**.
3. **Copies, not a live document.** An assigned assessment owns a snapshot of the
   content (§3.4).
4. **No *moving* a published exam** between groups in v1 — only copying. Moving
   would move grades across groups and break the isolation story.

---

## 3. Design

### 3.1 Model: separate the **library item** from the **assignment**

```
                    ┌──────────────────────────┐
                    │  exam_library_items      │  the teacher's own copy
                    │  ─────────────────────── │
                    │  id                      │
                    │  tenant_id               │
                    │  owner_id                │  author (profiles.id)
                    │  collection_id      ─────┼──► exam_library_collections
                    │  title                   │
                    │  kind ('homework'|'exam')│
                    │  subject_id              │  what it teaches, not a class
                    │  grade_level             │  "8°" — for filtering only
                    │  instructions            │  ProseMirror JSON
                    │  content                 │  { questions: [...] }
                    │  points_total            │
                    │  archived                │
                    └──────────────────────────┘
                              │
                              │  "Usar en un grupo" → copies content into
                              ▼
                    ┌──────────────────────────┐
                    │  assessments             │  the per-class instance (today)
                    │  library_item_id    ──────┼──► provenance, nullable
                    │  class_id                │
                    │  due_at, published       │  placement
                    │  content (copy)          │  snapshot — never auto-synced
                    └──────────────────────────┘
```

**Rule: the assignment owns a *copy*, not a pointer.** Editing a library item
never mutates an already-assigned assessment. To pull changes into a group the
teacher uses **Actualizar desde mi biblioteca**, allowed only while the
assessment is a draft or has **zero submissions** — the same guard the gradeboard
uses for freezing points after the first grade.

Rejected alternative: one `assessments` row with `class_id = null` meaning
"library", joined to groups through `assessment_assignments(class_id,
assessment_id)`. It avoids the copy, but every query, RLS policy, submission FK
and the mobile renderer would have to resolve "content from the join, placement
from the row". The copy is ~2 KB of JSON per group; correctness is worth more.

### 3.2 Collections

A **colección** is the teacher's folder: `Fracciones 8°`, `Repaso final`.

```
exam_library_collections (
  id, tenant_id, owner_id, name, color, position, created_at, updated_at
)
```

- **Personal, across groups.** Collections follow the teacher between classes —
  that is the point of a library as opposed to a class page.
- An item may live outside a collection (`collection_id null`, shown under
  **Sin colección**). Never force a filing decision at creation time.
- **Materia** and **Nivel** filters matter more than folders in practice —
  teachers remember "the fractions exam for 8th", not the folder name. Both are
  offered; collections are the primary axis.

### 3.3 Sharing to other teachers

Sharing is per item, explicit, and revocable. Two kinds, both opt-in:

| Share | What the recipient gets | Why |
| ----- | ----------------------- | --- |
| **Compartir con un docente** | The item appears in their library under **Compartido conmigo**, read-only | The common case: "use my quiz for this unit" |
| *(later)* **Compartir con la institución** | Visible to every teacher of the school | Coordination across grade levels — not v1 |

- The recipient **clones on use**: **Usar en un grupo** copies into their own
  item (owner = them), so their edits never touch the sharer's original and the
  sharer can revoke without breaking anyone's work.
- The sharer sees **Compartido con N docentes** on the card and can revoke.
- Sharing respects the isolation rule of this repo: nothing crosses tenants, and
  nothing crosses teachers without an explicit grant.

```
exam_library_shares (
  id, tenant_id,
  item_id    → exam_library_items  on delete cascade
  shared_by  → profiles
  shared_with → profiles,
  created_at,
  unique (item_id, shared_with)
)
```

Read policy for the recipient is a **grant join**, not an "everyone sees it"
rule, so a default misconfiguration exposes nothing.

### 3.4 Reusing: the flows

**From a class** (the everyday path):

```
Aula virtual → Trabajo de clase → Crear
  ├── Tarea             (blank, as today)
  ├── Examen            (blank, as today)
  └── Desde mis evaluaciones…     ← new
        └── drawer: search + filters (Materia · Nivel · Colección · Compartidas)
              └── "Usar en esta clase"
                    ├── copies content into a new draft assessment here
                    ├── proposes the rubro (see 3.5)
                    └── opens the builder to set the due date
```

**From the builder** (the path that makes the library grow without extra work):

```
Assessment builder (⋯ menu)
  └── "Guardar en mis evaluaciones"   ← saves the current definition as an item
        └── choose/create collection → done
```

**One draft per group per use.** Using the same item twice in one class is
allowed (a retake with a different date); the UI *warns* ("Ya usaste esta
evaluación en este grupo el 12 oct") rather than blocking.

### 3.5 Rubro targeting (the second half of the request)

The gradeboard column must land in the right rubro. Today it takes the **first**
active rubro, so an Examen can land inside Tareas and quietly shift the final.

Resolve by **kind first, then by name, then ask**:

```
rubroFor(kind, rubros):
  1. rubro.default_kind = kind        (set by the wizard / rubric editor)
  2. rubro whose name matches the kind ("Exámenes"; "Tareas"/"Trabajos")
  3. else → create the column UNASSIGNED; it shows under "Sin rubro",
     with the existing one-click "Mover al rubro"
```

Add `grade_rubros.default_kind` (nullable, `'homework' | 'exam'`), set by the
first-run wizard and editable in the rubric editor. Both the Aula virtual
publish path and the gradeboard's own **Agregar columna** use the same resolver.

**Never silently choose a wrong rubro.** If steps 1 and 2 both fail the column
lands unassigned (visible, harmless) rather than inside an arbitrary rubric.

The library item carries a suggested kind, so **Usar en esta clase** proposes
the destination without asking twice:

```
Library item (exam) + target rubros (Tareas 25, Exámenes 40)
  → "Se guardará en Exámenes (40%)"            [Cambiar]
```

### 3.6 Schema (additive, `weeon-tenants` only)

```sql
-- 1. Collections
create table public.exam_library_collections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Library items
create table public.exam_library_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid references public.exam_library_collections (id) on delete set null,
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
  constraint exam_library_items_kind_check check (kind in ('homework', 'exam'))
);

-- 3. Explicit shares
create table public.exam_library_shares (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null references public.exam_library_items (id) on delete cascade,
  shared_by uuid not null references public.profiles (id) on delete cascade,
  shared_with uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, shared_with)
);

-- 4. Provenance on the per-class instance
alter table public.assessments
  add column if not exists library_item_id uuid
    references public.exam_library_items (id) on delete set null;

-- 5. Rubro routing hint
alter table public.grade_rubros
  add column if not exists default_kind text;

alter table public.grade_rubros
  add constraint grade_rubros_default_kind_check
  check (default_kind is null or default_kind in ('homework', 'exam'));
```

**RLS**

- `exam_library_items`: owner full access; recipient **select only** through
  `exists (select 1 from exam_library_shares s where s.item_id = id and
  s.shared_with = auth.uid())`; tenant-gated on both paths.
- `exam_library_shares`: the sharer manages their own rows; the recipient can
  read their own grants (needed for the `Compartido conmigo` view).
- `exam_library_collections`: owner only.
- A school admin may **read** (for support), never write another teacher's items.
- Trial read-only trigger as on `assessments`.

### 3.7 Copy semantics (write it down once)

| Field | On "Usar en un grupo" |
| ----- | --------------------- |
| `title`, `kind`, `instructions`, `content`, `points_total` | **copied** |
| `subject_id` | copied; falls back to the class's subject |
| `library_item_id` | set (provenance) |
| `class_id` | the target |
| `due_at` | **cleared** — a date only makes sense per group |
| `published` | **false** (draft) |
| `position` | last in the class list |
| submissions | none |

Submissions and grades **never** travel. That is the isolation rule this repo
lives by.

---

## 4. UX

### 4.1 Where it lives

**`/aula-virtual/mis-evaluaciones`** — a section under Aula virtual (nav entry
**Mis evaluaciones**), plus a drawer inside a class (**Crear → Desde mis
evaluaciones…**).

Two tabs:

- **Mías** — grouped by collection; each item is a card.
- **Compartidas conmigo** — read-only items other teachers granted; each opens a
  preview with **Duplicar a mi biblioteca**.

Item card:

```
┌─────────────────────────────────────────────┐
│ [EXAMEN]                          ⋯ menu   │
│ Fracciones — evaluación 1                    │
│ 12 preguntas · 40 puntos                     │
│ Matemática · 8°                              │
│ Usado en 3 grupos · Compartido con 2         │
└─────────────────────────────────────────────┘
```

⋯ menu: **Vista previa** · **Editar** · **Duplicar** · **Mover a colección** ·
**Compartir con un docente…** · **Archivar**.

### 4.2 Preview and usage evidence

- **Vista previa** reuses the existing student view (`assessment-preview.tsx`), so
  what the teacher previews is exactly what a group will see (answers stripped).
- Cards show **Usado en N grupos**; the detail lists which groups and when.
  Without it a teacher keeps recreating duplicates because they cannot remember
  what they already have.

### 4.3 Empty states

- No items: *"Todavía no tiene evaluaciones guardadas. Cree una en un grupo y
  use **Guardar en mis evaluaciones** desde el editor."* + **Crear evaluación**.
- No shared items: *"Ningún docente ha compartido evaluaciones con usted."*
- Search with no results: *"Ninguna evaluación coincide. Pruebe otra materia o
  colección."*

---

## 5. Risks

| Risk | Mitigation |
| ---- | ---------- |
| **Stale copies.** A typo fixed in the library stays in assigned groups. | **Usado en N grupos** + **Actualizar desde mi biblioteca** on drafts (zero submissions). Notice: *"La evaluación cambió el 20 oct"*. |
| **Copy sprawl.** Same exam used 6 times, 6 divergent versions. | Store `library_item_updated_at` on the copy and badge divergence. |
| **Hidden gradeboard impact.** A reused exam creates a column; a careless rubro moves FINAL. | §3.5 resolver + unassigned fallback. Never guess. |
| **Leaked answers.** `content` holds the answer key. | Preview strips answers for the student view; items are teacher-only via RLS. |
| **Accidental sharing.** | Nothing is shared by default; recipient access is a grant row, revocable at any time. |
| **Deleting an item.** | `on delete set null` on `library_item_id`: assigned copies survive and lose provenance. Deleting a collection never deletes items. |

---

## 6. Acceptance criteria

- [ ] Author an exam in 1B, **Guardar en mis evaluaciones**, use it in 2A → 2A
      gets its own draft with identical questions; editing 2A leaves 1B alone.
- [ ] Publish the 2A copy → the gradeboard gets a column **in Exámenes**, not in
      the first rubro.
- [ ] If the class has no rubro for the kind, the column appears under
      **Sin rubro** and can be moved with one click — nothing silently
      mis-weighted.
- [ ] Editing the library item after 2A published leaves 2A untouched.
- [ ] Due date is empty on the copy; submissions and grades never cross groups.
- [ ] A colleague sees **nothing** in their library until one item is shared with
      them; revoking removes it immediately.
- [ ] A teacher from another school sees nothing (tenant).
- [ ] Deleting a library item leaves its assigned groups intact.
- [ ] The gradeboard's **Agregar columna** uses the same rubro resolver.

---

## 7. Phases

| Phase | Scope | Status |
| ----- | ----- | ------ |
| **B1 — Rubro routing** | `grade_rubros.default_kind`, resolver, wizard + rubric editor set it, publish path uses it, gradeboard "Agregar columna" uses it | **Built** |
| **B2 — Save to library** | Tables, RLS, **Guardar en mis evaluaciones** in the builder, `/aula-virtual/mis-evaluaciones` listing (Mías) | **Built** |
| **B3 — Use in a class** | **Desde mis evaluaciones…** dialog, copy semantics, rubro proposal per card | **Built** |
| **B4 — Collections & filters** | Collections CRUD, Materia/Nivel filters, **Usado en N grupos** | **Built** |
| **B5 — Share with a teacher** | `exam_library_shares`, **Compartir con un docente…**, **Compartidas conmigo**, duplicate-to-mine | **Built** |
| **B6 — Sync from library** | `updateAssessmentFromLibrary` exists; divergence badge and the editor entry are still to do | Server side only |

**B1 before the rest**, so the rubro bug is not reproduced into every reused
assessment.

---

## 8. Naming (locked)

| Concept | UI (ES) | Code |
| ------- | ------- | ---- |
| The feature / section | **Mis evaluaciones** | `library` |
| A reusable item | **evaluación** (card), **evaluación guardada** (verb: *Guardar*) | `exam_library_items` |
| A folder | **colección** | `exam_library_collections` |
| Using one in a class | **Usar en esta clase** | `copyLibraryItemToClass` |
| Sharing | **Compartir con un docente** | `exam_library_shares` |
| Tabs | **Mías** / **Compartidas conmigo** | `mine` / `shared` |

Route: `/aula-virtual/mis-evaluaciones`.

---

## See also

- [`aula-virtual.md`](aula-virtual.md) § Assessments & the WYSIWYG builder
- [`calificaciones-rubros.md`](calificaciones-rubros.md) § 3 Calculation rules
- [`grupos.md`](grupos.md) — the gradeboard
