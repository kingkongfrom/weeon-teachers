# Rubros ponderados — gradebook weights (requirements)

*Status: **P1–P4 implemented** (19 October 2026). P5–P7 are follow-ups.
Written 19 October 2026; decisions §11 locked 19 October 2026.*

## Built (implementation map)

| Piece | Where |
| ----- | ----- |
| Schema, RLS, `replace_rubros` RPC, backfill, `assignments.rubro_id` | `weeon-tenants/supabase/migrations/20261019160000_grade_rubros.sql` |
| Explicit delete + `reset_grade_rubros` | `weeon-tenants/supabase/migrations/20261019173000_grade_rubros_explicit_delete.sql` |
| Wizard auto-assigns orphan columns | `weeon-tenants/supabase/migrations/20261019174500_grade_rubros_assign_orphans.sql` |
| Generated types | `weeon-tenants/lib/supabase/database.types.ts` (`grade_rubros`, `assignments.rubro_id`, `replace_rubros`) |
| Calculation module + 16 unit tests | `weeon-teachers/src/lib/dashboard/grade-weights.ts`, `grade-weights.test.ts` |
| Rubros loader, `ExamColumn.rubroId` | `weeon-teachers/src/lib/dashboard/exams.ts` |
| Server actions (`saveRubros`, `moveColumnToRubro`, rubro on add/restore) | `weeon-teachers/src/lib/teachers/exams-actions.ts` |
| Matrix headers/footers, CSV grouping, wizard/card | `weeon-teachers/src/components/grades/gradebook-workspace.tsx` |
| Inline rubro header editor (name, peso, delete, add, drag) | `weeon-teachers/src/components/grades/rubro-header-cell.tsx` |
| Block order helpers (`moveItem`, `orderColumnsByBlocks`) + tests | `weeon-teachers/src/lib/dashboard/grade-order.ts` |
| Wizard + rubric editor + column mover | `weeon-teachers/src/components/grades/rubric-dialog.tsx` |
| Transcript weighted subject final | `weeon-teachers/src/lib/dashboard/student-report.ts` |
| Assessment publish assigns a rubro | `weeon-teachers/src/lib/teachers/assessments-actions.ts` |

**Not done (P5–P7):** reports still use the column average (§7), no mobile
changes, no per-period weight sets. The gradebook shows a banner stating the
reports caveat.

Teacher web → **Mis grupos → Calificaciones** (`/grupos/[id]?subject=…`,
`GradebookWorkspace`). Source request:

> 1. Porcentaje total por rubro. Cada rubro debe de tener un porcentaje total.
>    - Ejemplo: Tareas 30% de la nota total, Examen 50%, Proyecto 20%.
>    - Este porcentaje debe de ser visible en la tabla de calificaciones.
>    - Profesor debe de poder definir el valor por rubros a calificar.
>    - Profesor podrá crear rubros adicionales a calificar.

Owner's follow-up (19 Oct): teachers create **new** rubros (Quiz, Proyecto,
Laboratorio…), **Tareas / Exámenes / Proyectos ship as the base set —
names only, with no pre-filled weights** (the teacher picks every peso; the
`30 / 50 / 20` in the original request is an example), and the
teacher defines **both** the per-column value **and** the combined
weight of all columns in a rubro, so the rubros add up to 100 %.

This is a **major change** — it spans `weeon-tenants` (schema/RLS/RPC),
`weeon-teachers` (UI + loaders + reports later) and, eventually, report
consumers. Read [`grupos.md`](grupos.md) and [`aula-virtual.md`](aula-virtual.md)
§ Grades first.

---

## 0. Glossary (lock this before coding)

| Term | Meaning | UI copy (ES) |
| ---- | ------- | ------------ |
| **Rubro** | A grading category with a **peso over the subject FIN**, holding one or more columns. | **Rubro** |
| **Peso del rubro** | The % this rubro contributes to the FIN. All rubros together target **100 %**. | **Peso** |
| **Peso de la columna** | The column's relative value **inside its rubro** (`assignments.points`). Only relative. | **Puntos** |
| **Nota de rubro** | The student's % inside one rubro (weighted by column points, §3.3). | **Nota del rubro** |
| **FIN** | Weighted final for the subject. | **Nota final** |

**Two different "porcentajes" — never mix them in code or copy:**

- **Peso de la columna** (`assignments.points`, `grades.max_marks`) — how much
  a single column is worth *relative to its siblings in the rubro*. Already
  shipped. Example: Tarea 1 = 10 pts, Tarea 2 = 20 pts → Tarea 2 counts twice
  inside Tareas.
- **Peso del rubro** (`grade_rubros.peso`) — **new.** How much the rubro is
  worth of the FIN. Example: Tareas 30 %.

> A teacher reading "Tareas 30 %" must never think a single Tarea is 30 %.
> The editor states this in one line: *"El peso reparte la nota final entre
> rubros. Dentro del rubro, los puntos de cada columna definen cuánto pesa."*

---

## 1. Today's behaviour (baseline — what changes)

| Today (`gradebook-workspace.tsx`, `src/lib/dashboard/exams.ts`) | After |
| --- | --- |
| Columns are `assignments` rows with a `kind` (`classwork`, `homework`, `exam`, `quiz`, `project`) and nullable `points` (max; default **100** when empty). | Unchanged: column points still exist and still define the **relative** value inside a rubro. |
| `category` (`classwork` \| `evaluation`) is **derived** from `kind` (`categoryFor`, `exams.ts:34`) and only orders groups. | Vestigial for the gradebook; **keep writing it** (§11 D5) so mobile/ERP filters keep working. Rubros replace it as the grouping level. |
| Header group is a per-`kind` strip. | Header group is **per-rubro** with its peso badge; column labels keep the kind (`TAR 1`, `EXAM 1`). |
| Student FIN = **unweighted mean of every column %** (`studentAverage`, line 93). Bottom row = mean of all column %. | FIN = **Σ (rubro % × peso)** over rubros with data, **renormalised** (§3.4). Bottom row = per-rubro promedio + FIN. |
| Grades columns are all equal. | Column % is still `mark / maxPoints`; column points only matter **inside** a rubro (§3.3). |
| `assignments.assessment_id` links a quiz/exam to its grader. | Unchanged; the published column lands in a rubro just like a manual column. |
| CSV = students × columns + FINAL. | CSV gains rubro grouping + pesos; FINAL is the weighted value. |
| Apoyos gate blocks grade writes until read-ack + period registro. | Unchanged; the rubric editor sits behind the **same** gate (§5.4). |
| Reports snapshot (`lib/reports/*`) stores `grades` + `assignmentsMeta` (title/kind/category/points) and computes FIN = mean of column %. | **Out of this sprint.** Flagged in §7: the report still shows the old average until the reports sprint rewrites it. Do **not** silently change report numbers mid-feature. |

Nothing in the DB models a grouping today; `assignments.category` is a fixed
two-value enum with a `check` (`00001_core_schema.sql:7296`), so rubros need
new tables.

---

## 2. Product requirements

### 2.1 Rubros per **class + subject** (locked §11 D2)

- A rubro belongs to **one class** (`classes.id`) **and one subject**
  (`subjects.id`). Never global, never shared across groups. The teacher of
  8°A and 8°B edits each one.
- Fields: **nombre**, **peso (%) int 0–100**, **orden**, **color** (optional,
  shared tone palette), **archivado** (soft delete).
- **Base set — names only, no weights (owner clarification).** The product
  pre-fills **three rubro names** so a teacher never starts from a blank table:

  | Rubro | Peso |
  | ----- | ---- |
  | Tareas | *(vacío)* |
  | Exámenes | *(vacío)* |
  | Proyectos | *(vacío)* |

  **The teacher chooses every peso.** `30 / 50 / 20` and any other split in
  this doc are **illustrations only** — nothing is pre-filled with a number
  and no default split ships.

  Applied by the wizard (§5.2), which opens with the three names and empty
  peso fields; the teacher may rename, delete, or add rubros before typing the
  weights. Nothing is created silently on page load.
- **New rubros:** teachers add Quiz, Laboratorio, Libro, Participación, etc.
  `nombre` required, trimmed, ≤ 60 chars, unique **case-insensitive** per
  (class, subject).
- **Peso** is an **integer 0–100** (§11 D1). A decimal typed in the UI is
  rounded half-up and the rounded value is shown immediately. 0 is allowed
  (parks a rubro without breaking the total).
- **Delete** only when the rubro has **no columns**; otherwise **archivar**
  (hidden, data preserved, excluded from FIN).
- **Reiniciar rubros** (editor, destructive): removes every rubro of the
  subject and leaves its columns as **Sin rubro**. Grade rows are untouched;
  the teacher then creates the rubric and assigns columns.
- **Reorder** drives the header order (↑/↓ buttons; drag optional later).

### 2.2 Column values and rubro totals (owner clarification)

The teacher controls **two independent numbers**:

1. **Puntos por columna** (`assignments.points`): the max of a single
   Trabajo/Tarea/Examen. E.g. Tarea 1 = 10 pts, Tarea 2 = 20 pts.
2. **Peso del rubro** (`grade_rubros.peso`): the combined weight of **all**
   columns in that rubro, **typed by the teacher** (no shipped default). E.g.
   all Tareas together = 30 % of the FIN *if that is what the teacher
   decided*.

Therefore, inside Tareas, Tarea 2 weighs **twice** Tarea 1 (20 pts vs 10 pts),
but the pair still only sums to 30 % of the final. That is why §3.3 divides by
the **sum of points**, not by the column count.

**All rubros together = 100 %.** The UI shows the running total, warns in
amber when it isn't 100, and renormalises when it's off (§3.4). It never
blocks saving (a teacher mid-edit is not a corrupt state).

### 2.3 Assigning columns to rubros

- **Agregar columna** gains a first-field **Rubro** selector; default is the
  last-used rubro, else the first.
- Existing columns backfill to a legacy **General 100 %** rubro (§6.4); the
  teacher reassigns them from the rubric editor's **Columnas** list.
- A column is in **exactly one** rubro. No "unweighted" column after
  migration. A subject with zero rubros forces the wizard (§5.2) before a
  column can be created.

### 2.4 Weights visible in the table (request point 3)

- Rubro group header: **`Tareas · 30%`** badge, purple tint like FIN.
- Footer: **Rubro %** per group, plus the class FIN bottom-right.
- **All rubros together must equal 100 %.** The chip no longer exists in the
  matrix; the editor shows **Peso total**, blocks **Guardar rubros / Crear
  rubros** until it is exactly 100, and the gradebook shows an amber banner with
  a shortcut to the editor while it is off (data already saved keeps computing,
  renormalised).

### 2.5 Non-goals (v1)

- Per-period (I/II periodo lectivo) weight sets — §9 P7.
- Per-student weight overrides — forbidden (non-goal).
- Copying rubros between groups — decided **no** for v1 (§11 D2); can be
  reconsidered as a convenience later, but each group stays independently
  editable.
- Editing rubros from the school ERP — teacher web only.
- Parent/student mobile rubric breakdown — §9 P6, and mobile Notas is
  **explicitly unchanged** (§11 D5).
- Rewriting `/reportes` + admin boletas around rubros — **next sprint**
  (§11 D4), see §7.

---

## 3. Calculation rules (one pure module, unit-tested)

Module: **`src/lib/dashboard/grade-weights.ts`** — framework-free, no
`"server-only"`, no Supabase. Gradebook, `/estudiantes/[id]` and (later) the
report composer import **it**, not their own copy. Today the formula is inline
(`studentAverage`, `gradebook-workspace.tsx:93`) — delete that.

### 3.1 Inputs

- `rubros[]`: `{ id, name, peso, position, archived }`
- `columns[]`: `{ id, rubroId, points, grades: { [studentId]: { mark, status } } }`
- Column %: `clamp(mark / points × 100, 0, 100)`; `points` null → **100**
  (same as `columnMaxPoints`, line 71). `status = "missing"` and a closed
  column without a mark count as **0 % with data**. No row and not closed →
  **no data**, never 0.
- A `mark` above `points` clamps to 100 %.

### 3.2 Peso validation

- Stored as `smallint` 0–100 (§11 D1).
- Any total allowed; treated as **relative** when renormalising. Amber warning
  only, never a hard block.
- Editing two rubros at once (e.g. 40/40/20) can transiently total 120 % —
  the dialog only warns on save.

### 3.3 Rubro % — **points-weighted** (owner clarification, §2.2)

```
rubroPct(student, rubro):
  cols   = columns in rubro with a % for THIS student
  Σpts   = Σ points(col) for cols        (null → 100)
  if cols empty or Σpts == 0 → null
  return Σ (colPct × points(col)) / Σpts
```

- Within a rubro, a 20-pt Tarea outweighs a 10-pt Tarea (2:1).
- The rubro total is then scaled by the **rubro peso**, so points **never**
  leak across rubros: pumping Tareas to 500 pts does not change the 30 %.
- All columns in a rubro with equal points (the common case, e.g. 100 each)
  behave like a plain mean — identical to v1 expectations.

### 3.4 FIN (subject final)

```
active      = rubros where archived = false AND rubroPct(student, r) !== null
totalWeight = Σ active.peso

FIN = totalWeight > 0 ? Σ (rubroPct × peso) / totalWeight : null
```

- **Renormalise.** An October class with only Tareas graded shows the Tareas
  average as FIN (not 30 % of it).
- Display rounded to whole % (`Math.round`); keep the raw number internally.
- **Computed in TS**, not stored, until P5 decides otherwise.

### 3.5 Worked examples

**A — all rubros graded, 100 %.**

| Rubro | Peso | Columns (pts) | Rubro % | Contribution |
| ----- | ---- | ------------- | ------- | ------------ |
| Tareas | 30 | T1 10 pts = 70 %, T2 20 pts = 97 % | (70×10 + 97×20)/30 = **88 %** | 26.4 |
| Exámenes | 50 | E1 100 pts = 60 % | **60 %** | 30.0 |
| Proyectos | 20 | P1 100 pts = 90 % | **90 %** | 18.0 |
| **FIN** | 100 | | | **74.4 → 74 %** |

A plain mean of the columns would have given (70+97+60+90)/4 = **79.3 %** —
proof that the points-weighted rubric is a real behaviour change, not a
renumbering.

**B — missing rubro (renormalisation).** Tareas 80 % (peso 30), Exámenes 60 %
(peso 50), Proyectos ungraded → FIN = (80×30 + 60×50) / 80 = **67.5 → 68 %**.

**C — closed rubro.** Proyectos **closed** with nobody graded writes 0s for
everyone → Proyectos 0 %, so FIN = (2400 + 3000 + 0) / 100 = **54 %**.
Closing a column/rubro is deliberate; the editor warns *"Proyectos aún no
tiene notas: no cuenta"* until it is closed.

---

## 4. Edge cases

| Case | Rule |
| ---- | ---- |
| Rubro, 0 columns, peso > 0 | No data → excluded from FIN; `—` in footer. |
| Columns exist, none graded, not closed | No data → excluded (never silent 0). |
| All columns in a rubro closed | 0 % for everyone → counts. |
| Column points null | 100 (unchanged). |
| Column points 0 | Ignored in `Σpts`; if all are 0 the rubro is no data. |
| Mark > points | Clamp to 100 %. |
| Student in the class, no grades at all | FIN `—`. |
| Column moved to another rubro | Live recompute; grade rows untouched. |
| Peso total ≠ 100 (legacy state) | Computed renormalised; the editor blocks saving until it is 100. |
| Duplicate rubro name (case/accents) | Blocked (unique index on `lower(name)`). |
| Subject with no rubros | Wizard (§5.2); no column creation until resolved. |
| Archived rubro with grades | Hidden, excluded, restorable from **Archivados**. |
| Legacy columns (`subject_id is null`) | `rubro_id` null; only in the legacy "Sin materia" view. |
| Legado backfill | `General 100 %`; equals the old mean when the columns share points (the common 100-pt case), otherwise the points now weight inside that rubro (§3.3). |
| Two devices edit rubros | Last write wins per rubro; matrix refetches after save. |
| Publishing an assessment | Column joins the chosen rubro; `points` from `assessments.points_total`. |
| Apoyos pending | Editor and grade writes both blocked (§5.4). |

---

## 5. UX (Spanish; teacher web only)

### 5.1 Matrix header

```
 ┌───────────────────────────────────────────────────────────────────┐
 │  [Editar rubros]                      [Buscar]      [Exportar]    │
 ├──────────────┬───────────────────┬────────────────────┬───────────┤
 │              │  Tareas · 30%     │  Exámenes · 50%    │ Proy ·20% │
 │ Estudiante   │ TAR 1   TAR 2     │ EXAM 1   PRUE 1    │ PROY 1    │
 │              │ 10 pts  20 pts    │ 100 pts  50 pts    │ 100 pts   │
 ├──────────────┼───────────────────┼────────────────────┼───────────┤
 │ Ana Pérez    │ 7       19        │ 60       35        │ 90        │   FIN 74%
 ├──────────────┼───────────────────┼────────────────────┼───────────┤
 │ Prom. col.   │ 70%     97%       │ 60%      70%       │ 90%       │
 │ Total rubro  │       88%         │       63%          │ 90%       │  Promedio 74%
 └──────────────┴───────────────────┴────────────────────┴───────────┘
```

The footer names each rubro again (`Tareas 88%`) and closes with
**Promedio**; every displayed percentage is a whole number (`Math.round`),
including the student FIN.

Each rubro group ends with a **Total** column showing that student's **points
earned with the resulting grade**: `28 / 30` and `93%` side by side. Points
without the grade are unreadable for dirección; the grade without points loses
the evidence, so they always travel together. Per column: **puntos del rubro
(nota)**. Footer per rubro: **points average + class grade**, with the peso.

All of these come from one model — `src/lib/dashboard/scoreboard.ts`
— so the cells, the footer, the CSV and the print view cannot disagree.

**Pts / % (toolbar)** — marks are *entered* in points; this switch decides how
they *read*: `Pts` shows the mark (`8`) and the rubro Total as
`28 / 30 · 93%`; `%` shows the grade each mark produces (`80%`) and the
rubro Total as `93%`. **The `%` view is read-only** — it is a lens on the
stored points, not a second input mode. Switch to `Pts` to edit; arrow keys
still walk the grid in either view.

**Reading the numbers (the scoreboard contract)**

| Value | Meaning |
| ----- | ------- |
| Column cell | Mark / column points |
| Rubro **Total** | Sum of points of that rubro's columns + points-weighted grade 0–100 |
| Rubro **footer** | Class points average + class rubro grade |
| **FINAL** | `Σ (nota × peso) ÷ Σ peso` over the rubros that have data (renormalised) |
| **Promedio** (footer right) | Class average of FINAL |

A rubro only counts in FINAL once it has grades, so an in-progress term reads
as the average of what has been graded instead of a fraction of it. A cell can
never exceed 100 %: the model clamps each grade.

**Scoreboard summary (top of the page)** — four facts for dirección:
**promedio del grupo**, **aprobación** (share of students at ≥ 70 %),
**rango** (min → max on a 0–100 track with the pass mark ticked and the
**median** marked, so the spread, its position relative to 70 % and whether an
outlier is pulling the average all read at a glance) and **sin nota**
(students with no final yet, amber when non-zero).

**Row tools** — sort by name / final ↓ / final ↑, and filters for
**Pendientes** and **En riesgo**. A student who can no longer reach 70 % with
the weight that is left gets a red **En riesgo** flag; a student who is below
but can still pass shows the grade they must average on what remains.

**Phones (< 768 px)** — the matrix is replaced by **cards**, one per student:
name, final grade, risk chip and a thin bar per rubro. A squeezed matrix on a
phone needs side-scrolling and hides the answer, so the card is the default;
**Tarjetas / Tabla** switches to the real matrix when a teacher wants it.
From **768 px up (iPad portrait, iPad landscape, desktop) the full matrix is
always shown** — a tablet is never stuck in the read-only cards, and the switch
is hidden there. The
toolbar collapses to icon-only buttons, the search/filter row scrolls
horizontally, and the summary grid becomes 2 × 2 with the range spanning a row.
The viewport is exported from src/app/layout.tsx with iewport-fit=cover
and the dialogs are bottom sheets sized in dvh with safe-area padding, so
iOS Safari's URL bar and home indicator do not cut content off.

**Print (Imprimir)** — the app chrome, toolbars and sticky offsets are dropped
and the table prints landscape with a header (grupo · materia · rubros · leyenda)
for the PDF that goes to dirección (`globals.css` § print-scoreboard).

**CSV** — one row per student plus a second row with each rubro's
`puntos/posibles` and grade, closed by a class-average footer.

- Group header: **nombre · peso**, purple badge; sticky, no wrap.
- Column line keeps the **kind** label (`TAR 1`, `EXAM 1`) so a rubro mixing
  kinds still reads; density labels unchanged.
- **Nota rubro** footer (new) per group. Bottom-right = class FIN computed
  from class totals, not the mean of student FINs.
- The rubric editor lists every column with its rubro selector (**Columnas**),
  so a legacy `General` column is reassigned there (no separate column menu).

### 5.2 Two-step first-run wizard (answers the owner's "do we need a wizard?")

**Yes — but only once per class+subject, and it stays skippable.** The
confusion is real: "peso" (rubro) vs "puntos" (column) is exactly where
teachers get lost. The wizard frames the model in one screen instead of
through documentation.

```
 Paso 1 de 2 — Reparto de la nota final
  ┌──────────────────────────────────────────────┐
  │  Rubro           Peso (%)                    │
  │  Tareas          [    ]                      │
  │  Exámenes        [    ]                      │
  │  Proyectos       [    ]                      │
  │  + Agregar rubro (Quiz, Laboratorio, …)      │
  │                                              │
  │  Total: — %   (debe sumar 100%)              │
  │  [ Continuar ]            (disabled until    │
  │                            ≥1 rubro + pesos) │
  └──────────────────────────────────────────────┘
 Paso 2 de 2 — Puntos de cada columna
  "Dentro de cada rubro, los puntos deciden cuánto pesa cada
   tarea o examen. Ejemplo: Tarea 1 = 10 pts, Tarea 2 = 20 pts."
  [ Crear rubros ]   [ Omitir por ahora ]
```

- **Step 1 ships with the three names and empty peso fields** (§2.1). The
  teacher types every peso. The only pre-filled number is **none**; if the
  teacher needs a starting point they can use **Repartir en partes iguales**
  (an explicit helper that splits 100 evenly across the current rubros, then
  the teacher adjusts) — it is a button, never the default.
- **Continue** requires at least one rubro with a peso. The total may be ≠ 100
  (amber warning) — the teacher is never blocked from finishing the wizard.
- The `30 / 50 / 20` values in diagrams and examples throughout this doc are
  **illustrative only**.
- Triggered **only** when the subject has zero rubros (first open after the
  migration, or a brand-new subject). Afterwards, the same editor (§5.3)
  opens as a normal dialog — no wizard.
- **Omitir** leaves the subject rubric-less: the matrix renders a **Crear
  rubros** card; grade cells stay read-only until rubros exist (there is no
  meaningful FIN without them). Existing grades are never lost.
- Skipping is remembered per user+subject (localStorage of ids only, not
  data) so the wizard does not nag on every visit — the card is the way back.

### 5.3 Rubric editor (dialog / right sheet)

**Inline in the matrix (built 25 Oct 2026) — the primary path.** The rubro
header in the gradebook is itself the editor, using the same edit-in-place
pattern as the column titles below it (`components/grades/rubro-header-cell.tsx`):

- **Name** — click the rubro name, type, `Enter`/blur saves, `Esc` cancels.
- **Peso** — click the weight pill (`30%`), type digits, `Enter`/blur saves.
  The pill turns amber while the pesos do not add up to 100 %.
- **Delete** — the trash icon on the header (hover/focus); it asks for
  confirmation and is disabled for a rubro with columns (archive instead).
- **New rubro** — the `+` next to **Editar rubros** in the toolbar. It creates
  an empty rubro (weight 0, so the FIN does not move) and opens its header for
  renaming. Growing the rubric is a rubric decision, so it is **not** a cell
  inside the grade grid.
- **Change the order** — drag the grip on a header to move the whole block of
  columns. The order is persisted on release (`reorderGradebook`: rubro
  `position` + `assignments.created_at`), and a failed save restores the saved
  order.
- Every inline write goes through **one-row** actions (`createRubro`,
  `updateRubro`, `deleteRubro`) so a rename never rewrites the rest of the
  rubric. Saves are optimistic and revert on refusal.
- A rubro may appear in **more than one block** (e.g. `Tareas 5 %` twice, or a
  100 % `Quiz`). The blocks are distinguished internally by an ordinal; the
  peso stays one number, and each block shows the same rubro share (`rubro % ×
  peso`), never a value above the peso.
- Drag is disabled while a local reorder has not been saved yet (the block keys
  are positional).

**Dialog — for the wizard and the column mover** (`rubric-dialog.tsx`); it also
stays the place to archive/restore rubros and to reassign columns:

- Header: `Matemática · 8°B`.
- Table: `Rubro` (inline name) · `Peso %` · `# columnas` · `Puntos` (sum, read
  only) · `⋮` (↑ / ↓ / archivar).
- Footer: **Peso total** (must be 100 to save), **Repartir en partes
  iguales**, **+ Agregar rubro**, **Guardar**. No weight presets.
- One atomic save (RPC, §6.3). Inline help line (§0 quote) under the table.
- Copy: `Rubro`, `Peso`, `Peso total`, `Puntos`, `Nota del rubro`,
  `Aún no tiene notas`, `Archivar`, `Archivados`, `Mover al rubro`,
  `Repartir en partes iguales`, `Agregar rubro`.

### 5.4 Apoyos Eduativos gate

The rubric editor writes on the subject grade policy → open it **through the
same gate** as grade saving. No bypass.

### 5.5 Empty / error

- Rubros load failure → fail the page (no silent unweighted fallback).
- After a rubric save, reload columns+grades via `fetchSubjectExams`.

---

## 6. Data model (`weeon-tenants`, additive only)

### 6.1 Tables

```sql
-- supabase/migrations/<next>_grade_rubros.sql   (draft; not applied)
create table public.grade_rubros (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  class_id    uuid not null references public.classes(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  peso        smallint not null default 0 check (peso between 0 and 100),
  position    smallint not null default 0,
  color       text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index grade_rubros_name_uq
  on public.grade_rubros (tenant_id, class_id, subject_id, lower(name));

alter table public.assignments
  add column rubro_id uuid references public.grade_rubros(id) on delete restrict;
create index assignments_rubro_idx on public.assignments (rubro_id);

-- Points stay where they are: assignments.points already exists.
-- Mobile / ERP compatibility: assignments.category keeps being written
-- (derived from kind) — §11 D5.
```

`rubro_id` is **nullable in the DB** (additive, old clients keep working);
the app treats null as invalid after migration. Everything else
(`points`, `grades`) is unchanged.

### 6.2 RLS

- Teachers who pass `teaches_class(class_id)` (same predicate as the existing
  `assignments` policies): `select/insert/update` on rubros.
- **Delete** is only reachable through the RPC (empty rubros only), so the
  policy can allow it and the RPC still guards it.
- School admin: `select` only. Rubric editing is a teacher surface.
- Service role: unfiltered.

### 6.3 RPC — atomic save

```sql
-- replace_rubros(p_class uuid, p_subject uuid, p_rubros jsonb) returns void
--   upsert each rubro by id (name, peso, position, archived)
--   delete ONLY rows explicitly flagged { remove: true }
--     (refused with 'rubro_has_columns' when the rubro owns assignments)
--   absence from the payload is a NO-OP — a stale client can never delete
--   refuse if any p_rubros.subject_id != p_subject (no cross-subject writes)

-- reset_grade_rubros(p_class uuid, p_subject uuid) returns integer
--   unassigns every column of the subject (rubro_id = null, grades untouched)
--   then deletes every rubro; returns how many rubros were removed.

-- assign_orphan_grade_columns(p_class uuid, p_subject uuid) returns integer
--   after the wizard saves, columns with rubro_id null join the rubro whose
--   name matches their kind (examen/prueba → exam|quiz, proyect → project,
--   tarea/trabajo → homework|classwork); fallback = first active rubro.
--   Manual assignments are never overwritten.
```

The editor saves **all** rubros in one call and sends removed rows with
`remove: true`. Implicit “absent means delete” was removed after it made a
stale editor try to delete the backfilled `General` rubro. The RPC also
re-reads the rubric before the dialog opens, so the payload matches the server.

The **Reiniciar rubros** button (edit mode) calls `reset_grade_rubros`: columns
become “Sin rubro” and keep every grade, so a teacher can start the rubric
from scratch without losing marks.

### 6.4 Backfill

For each `(tenant, class, subject)` with existing assignments:

1. Insert `General`, `peso = 100`, `position = 0`.
2. `update assignments set rubro_id = <id> where class_id = … and
   subject_id = … and rubro_id is null`.
3. Legacy `subject_id is null` rows stay null.

Idempotent (`where rubro_id is null`). The backfilled subject keeps every
column; its final equals the old mean **when the columns share the same
points** (e.g. all 100). Columns with different points now weight inside the
single rubro, which is the intended per-column rule (§3.3).

---

## 7. Repo impact

| Repo | Work |
| ---- | ---- |
| **`weeon-tenants`** | §6 migration, RLS, RPC, `database.types.ts`, `docs/data-access.md` row. No UI. |
| **`weeon-teachers`** | Loader (`ExamColumn.rubroId` + rubros), `grade-weights.ts` + tests, wizard, editor, header/footers, column dialog + move, CSV, i18n ES/EN, Apoyos gate, `/estudiantes/[id]` FIN via the same module, docs (`grupos.md`, `aula-virtual.md`, this file, `AGENTS.md`). |
| Reports (`/reportes`, `/grupos/[id]/reporte`) | **Rubro-aware.** `build-snapshot.ts` freezes `finals`, `rubros` and per-column `rubroId/rubroName/rubroPeso/rubroPosition` at submit; `lib/reports/rubros.ts` groups columns by rubro and computes the contribution (`rubro % × peso`, one decimal, capped at the peso). The composer + `/reportes` render a rubro-grouped table (rubro header with peso, `Total` column per student, `FINAL` whole %) and a **Desglose por rubro** (average per rubro, not per column). Reports submitted before rubros keep the flat table + column mean. |
| **Admin reports (future, `weeon-tenants`)** | Reuse the snapshot contract: read `grades_snapshot`, `assignments_meta`, `rubros`, `finals_snapshot` from `class_reports` and render through the same grouping rules (`lib/reports/rubros.ts` logic, ported or shared). No live `grade_rubros` join is needed. |
| **`weeon-mobile`** | **No change** (§11 D5). Parent/student Notas keeps the current subject summary. |
| **`weeon-management`** | None (no rubric data crosses tenants). |

**Sync rule:** if the formula changes, update `grade-weights.ts`, this doc,
`aula-virtual.md`, and the report composer **in the same change set**.

---

## 8. Acceptance criteria

- [ ] The wizard opens with **Tareas / Exámenes / Proyectos** and **empty
      peso fields** — no number is pre-filled.
- [ ] The teacher types any split (e.g. 40 / 40 / 20) and the matrix header
      shows exactly those pesos.
- [ ] Teacher creates "Quiz 10%", changes Tareas to 20%, saves; header and
      FIN recompute without a page reload.
- [ ] All rubros together = 100 % is visible; ≠ 100 shows an amber warning
      and still computes (renormalised).
- [ ] Column points matter **inside** a rubro: 20 pts weighs double 10 pts
      (§3.5 A: Tareas = 88 %, not the flat 83.5 % mean of 70 and 97).
- [ ] Raising a column's points never changes the rubro peso in the FIN.
- [ ] Adding a column requires a rubro; no rubro-less columns after migration.
- [ ] Only Tareas graded → FIN = Tareas average (§3.5 B), not 30 % of it.
- [x] Rubro name and peso editable directly in the matrix header (Enter saves,
      Esc cancels); new rubro from the dashed header cell.
- [x] Headers can be dragged to reorder the blocks, and the order survives a
      reload.
- [ ] Full cast at 100 % matches `0.3·Tareas + 0.5·Exámenes + 0.2·Proyectos`.
- [ ] Rubro with columns can't be deleted; can be archived/restored.
- [ ] Empty rubro deletes in one step.
- [ ] Wizard appears only once (zero rubros), is skippable, and never
      loses grades.
- [ ] Editor is behind the Apoyos gate.
- [ ] Legacy subject → `General 100 %`; with equal points the FIN equals the
      old average.
- [ ] `/estudiantes/[id]` FIN matches the gradebook for the same subject.
- [ ] Reports are **unchanged** and visibly flagged as old-average (or the
      chosen option from §7).
- [ ] Typecheck, lint, Vitest green; tests cover points-weighting,
      renormalisation, archived, no-data vs closed, clamping, rounding.
- [ ] Docs describe rubros as built, not aspirational.

---

## 9. Phased plan (each phase ships behind the previous)

| Phase | Scope | Repo |
| ----- | ----- | ---- |
| **P1 — schema** *(done)* | §6 migration, RLS, RPC, backfill, types, data-access doc. UI unchanged; null `rubro_id` still means old average. | `weeon-tenants` |
| **P2 — module + loader** *(done)* | `grade-weights.ts` + tests, `rubroId`, `fetchSubjectExams` returns rubros, FIN via the module. Backfilled data renders identical values when points are uniform. | `weeon-teachers` |
| **P3 — read UI** *(done)* | Rubro header + peso badges, rubro totals, CSV grouping. Read-only. **Safe stop point.** | `weeon-teachers` |
| **P4 — write UI (launch)** *(done)* | First-run wizard, rubric editor, add/move/archive, Rubro selector in Agregar columna, Apoyos gate, i18n, `/estudiantes/[id]` alignment, docs. | `weeon-teachers` |
| **P5 — FIN persistence (optional)** | Freeze FIN into report snapshots if reports need an immutable final. Decide at P4 launch. | schema + teacher web |
| **P6 — reports sprint** | Rewrite `/reportes`, composer snapshot, admin boletas around rubros (rubro breakdown → FIN). | teacher web + `weeon-tenants` |
| **P7 — mobile / periods** | Parent Notas breakdown (only if asked); per-periodo lectivo weight sets. | `weeon-mobile`, schema |

**Stop points:** after **P3** the feature is complete for display; after
**P4** it is usable. Nothing after P4 is required for launch.

---

## 10. UI copy (draft, ES; EN mirrors in `messages.ts`)

```
Rubro · Rubros · Peso · Peso total · Promedio del rubro · Puntos
Reparto de la nota final · Repartir en partes iguales · Agregar rubro
El peso reparte la nota final entre rubros. Dentro del rubro, los puntos
de cada columna definen cuánto pesa.
Aún no tiene notas: no cuenta · Archivados · Mover al rubro…
Tareas · Exámenes · Proyectos · Quiz · Laboratorio
```

---

## 11. Decisions (locked 19 October 2026)

| # | Question | Decision |
| - | -------- | -------- |
| D1 | Decimal pesos? | **Integer 0–100 only** (`smallint`). Decimals round half-up in the UI. |
| D2 | Rubros shared across groups? | **No — per class per subject.** No "copiar rubros" in v1. |
| D3 | Admin-defined presets in the ERP? | Not decided as a product feature; the teacher can always edit and is the source of truth. Pre-filled **names** = Tareas/Exámenes/Proyectos with **empty pesos the teacher types**. Possible later: admin-suggested weights inherited on first open — **not in v1**, parked in §12. |
| D4 | Reports | **Teacher reports now use the rubric** (snapshot `finals_snapshot`, migration `20261019183000`). Admin boletas in the ERP are a separate follow-up. |
| D5 | Mobile Notas | **Unchanged.** No mobile work in this feature. `assignments.category` keeps being written from `kind` for compatibility. |
| D6 | Wizard? | **Yes**, a 2-step first-run wizard (rubro pesos → column points), skippable; afterwards only the editor dialog. |
| D7 | Column points vs rubro weight | **Both exist.** Points = relative value inside the rubro; rubro peso = share of the FIN. Rubro % is **points-weighted** (§3.3). |

## 12. Parked (not decided / not v1)

- Admin-suggested rubro **weights** per subject (D3).
- Copying a rubric from another group as a convenience.
- Rubro color / icons.
- Per-periodo lectivo weights (P7).
- Parent/student rubric breakdown (P6).

## 13. Risks

| Risk | Mitigation |
| ---- | ---------- |
| Teachers confuse peso (rubro) vs puntos (columna) — the top usability risk. | Distinct words everywhere, the one-line help, the wizard's step 2, tooltip on the peso badge. |
| Reports disagree with the gradebook until the reports sprint. | §7 option (a)+(b): flag, never silently change numbers. |
| Partial rubric saves break the 100 % total. | Single RPC, one transaction. |
| Legacy `category` consumers (mobile/ERP) break. | Keep writing `category` from `kind`; rubros are additive. |
| Formula drift across gradebook / transcript / reports. | One pure module; §7 sync rule; tests. |
