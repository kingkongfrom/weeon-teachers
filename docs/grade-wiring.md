# Aula virtual → Calificaciones: the grade wiring

*How a homework or exam becomes a column in the gradebook, under the right
rubro, with the right grade. Written 26 Oct 2026 after auditing the whole path.
Status: **implemented** (see §8 for what was broken and §9 for the audit).*

---

## 1. The question this answers

> A teacher creates a Tarea or an Examen in Aula virtual. Students answer it.
> It gets graded — sometimes by the teacher, sometimes automatically. Those
> grades must appear in **Calificaciones**, inside the right **rubro**.
> Sometimes the rubric has no rubro for that kind. What happens?

There are **five** moments a column can come into existence and **four** ways a
grade can be written. Before this work each did its own thing, and two of them
disagreed. This document is the single account of what must happen.

---

## 2. The two objects (and why there are two)

| Object | Table | Meaning |
| ------ | ----- | ------- |
| **Assessment** | `assessments` | The thing students see: title, questions, due date, published state, `kind` (`homework` \| `exam`) |
| **Grade column** | `assignments` | The thing the gradebook sees: title, points, `kind`, `category`, **`rubro_id`**, and `assessment_id` linking back |

They are separate because most grade columns are **not** assessments: a teacher
adds "Participación" or "Dictado" straight from Calificaciones → **Agregar
columna**, and there are no questions behind it.

The link is `assignments.assessment_id`. One assessment has **at most one**
column. Students never see `assignments`.

```
assessments ──1:1──► assignments ──N:1──► grade_rubros
     │                    │                    │
 questions          grades rows          peso → FINAL
     │
 submissions ──► submission_answers
```

---

## 3. The five moments a column is created

| # | Moment | Code | Creates a column? |
| - | ------ | ---- | ----------------- |
| 1 | Assessment drafted | `saveAssessment` | **No** — drafts never surface |
| 2 | Assessment **published** | `setAssessmentPublished` → `syncGradeColumn` (TS) | **Yes** |
| 3 | Teacher grades a submission | `grade_assessment_submission` → `_apply_submission_grade` (SQL) | **Yes, if missing** (safety net) |
| 4 | Automatic grading finishes | same `_apply_submission_grade` | **Yes, if missing** (same safety net) |
| 5 | Teacher adds a column by hand | `addExamColumn` (TS) | Yes (no assessment) |

Moments **2**, **3** and **4** must produce the *same* row. That is the core
invariant of this document:

> **INVARIANT 1.** For a given assessment there is at most one `assignments`
> row, and it carries the same `kind`, `category`, `points` scale and
> `rubro_id` no matter which moment created it.

Before this work, moment 2 resolved a rubro and moments 3/4 **did not** — so a
grade could land in a column with `rubro_id = null`, outside every rubro and
therefore outside FINAL.

---

## 4. Choosing the rubro — the resolution ladder

A `kind` must map to one rubro of the class + subject. Three rungs, in order.
The first that matches wins; **nothing here may guess**.

```
resolveRubro(kind, rubros)
  │
  ├─ 1. EXPLICIT TAG      rubro.default_kind = kind
  │      Set by the wizard, editable per rubro in the rubric editor
  │      ("Tipo de columna: Tareas / Exámenes").
  │
  ├─ 2. NAME MATCH        rubro name IS one of the kind's names
  │      Tareas, Tarea, Trabajos, Trabajo, Trabajo en clase   → homework
  │      Exámenes, Examen, Pruebas, Prueba, Evaluación        → exam
  │      Whole-name, accent- and case-insensitive. "Repaso de examen"
  │      does NOT match — that is a different category.
  │
  └─ 3. NO MATCH          → column is created UNASSIGNED (rubro_id = null)
         Visible in the matrix under "Sin rubro", one click to move.
         Never silently dropped into the first rubro.
```

Implemented once in TypeScript (`src/lib/dashboard/rubro-routing.ts`,
`resolveRubroForKind`) and once in SQL (`public.resolve_rubro_for_kind`). Both
are tested; a mismatched pair is a bug.

### Why not "first rubro"

That was the original behaviour and it was the worst possible one: an Examen
published into `Tareas 30% / Exámenes 70%` landed inside **Tareas**, changing
every student's FINAL, with nothing on screen to explain it. A wrong-but-plausible
number is more dangerous than an empty cell, because nobody investigates an
empty cell that is not there.

### Why unassigned is safe

An unassigned column still shows its marks. It simply does not contribute to
FINAL until it is filed. The gradeboard renders `Sin rubro` with the same
one-click move it uses for any column. So the worst case is *visible and
recoverable*, never silent.

---

## 5. Points and scale

Two different numbers, often confused:

- **`assignments.points`** — the column maximum (the denominator).
- **`grades.mark` / `grades.max_marks`** — one student's result.

Rules:

1. On creation, the column's `points` = the assessment's `points_total`.
2. Grade columns **freeze** once the first grade exists (server action + DB
   trigger). Editing the assessment afterwards must not silently change past
   denominators.
3. On **direct mark** grading (teacher types `8` out of `10`), the column's
   `points` is re-scaled to the scale the teacher used, *but only while no
   grades exist* (`20261020090000_direct_mark_grading.sql`).
4. Auto-graded totals are clamped to `[0, max]` — a bug in an answer key must
   never produce `12/10` and inflate FINAL.

---

## 6. What each kind means

`assignments.kind` has five values; assessments only produce two.

| kind | Produced by | `category` | Routes to |
| ---- | ----------- | ---------- | --------- |
| `homework` | Tarea in Aula virtual | `classwork` | homework rung |
| `exam` | Examen in Aula virtual | `evaluation` | exam rung |
| `classwork` | **Agregar columna** by hand | `classwork` | homework rung |
| `quiz` | Agregar columna by hand | `evaluation` | exam rung |
| `project` | Agregar columna by hand | `classwork` | homework rung |

`kindForRouting()` performs the reduction: `category === "evaluation"` → the
exam side, otherwise the homework side. **Classwork is not a rubro** — it is a
*kind* that routes to whichever rubro holds coursework. A teacher who wants a
separate bucket names a rubro "Trabajo en clase" and the name rung picks it up.

---

## 7. The empty-rubric case

A brand-new subject has no rubros at all. Three options were considered:

| Option | Verdict |
| ------ | ------- |
| Create `General 100%` and file the column there | **Chosen** for the *first* column only — a documented compatibility fallback. It keeps a working gradebook on day one and the teacher can split the rubric later without losing the column. |
| Leave unassigned | Leaves FINAL null until the teacher visits the rubric, which reads as "the app is broken". |
| Auto-create Tareas/Exámenes | Invents a rubric the teacher never designed, with weights they did not choose. |

So: `rubric.length = 0` → `General 100%`; rubric exists but no match → unassigned.

---

## 8. What was actually broken (the audit)

| Bug | Where | Effect | Fix |
| --- | ----- | ------ | --- |
| **Grade columns from grading had no rubro** | `_apply_submission_grade` inserted `assignments` **without `rubro_id`** | A grade returned from Aula virtual landed outside every rubro and never counted toward FINAL — the exact complaint that started this work | The insert now resolves the rubro through `resolve_rubro_for_kind`, same ladder as publish |
| **Two resolvers, drifting** | TS `resolveRubroForKind` vs nothing in SQL | Publish and grading could disagree | One documented ladder, implemented in both, with the same tests |
| **Publish crashed on an unmigrated column** | `syncGradeColumn` selected `default_kind` | An optional routing tag could break publishing entirely | Read falls back to base columns; the tag is advisory |
| **No repair for already-broken columns** | — | Existing grades stay unassigned after the fix | `assign_orphan_grade_columns` extended to file assessment columns by kind |

---

## 9. Verification (what "mission critical" means here)

The flow is only trustworthy if each rung is exercised:

- [ ] Publish a Tarea → one column, `rubro_id` = Tareas, `points` =
      `points_total`
- [ ] Publish an Examen → column in **Exámenes**, never Tareas
- [ ] Grade a submission whose column is missing (safety net) → column created
      **with** a rubro
- [ ] Auto-grade Pareo → same column, same rubro, no duplicate row
- [ ] Publish twice / save twice → still **one** column (idempotent)
- [ ] Rubric with no matching rubro → column under `Sin rubro`, FINAL unchanged
- [ ] Rubric with no rubros at all → `General 100%`, column filed there
- [ ] Direct mark `8/10` → column points becomes 10, mark 8
- [ ] Edit the assessment after grading → points frozen
- [ ] Two assessments → two columns, each in its own rubro

---

## 10. Where the code lives

Migrations, in order (all additive, safe to re-run):

| Migration | What it does |
| --------- | ------------ |
| `20261026150000_grade_rubros_default_kind.sql` | adds `grade_rubros.default_kind` |
| `20261026151000_replace_rubros_default_kind.sql` | `replace_rubros` persists it (self-contained: also adds the column) |
| `20261026180000_grade_wiring.sql` | `resolve_rubro_for_kind` + `rubro_for_new_column` |
| `20261026181000_grade_wiring_apply.sql` | `_apply_submission_grade` files its column under a rubro |
| `20261026182000_grade_wiring_repair.sql` | `assign_orphan_grade_columns` uses the shared ladder |

| Concern | File |
| ------- | ---- |
| TS resolver + tests | `weeon-teachers/src/lib/dashboard/rubro-routing.ts` (`.test.ts`, 14 tests) |
| SQL resolver | `weeon-tenants/supabase/migrations/20261026180000_grade_wiring.sql` |
| Publish → column | `weeon-teachers/src/lib/teachers/assessments-actions.ts` → `syncGradeColumn` |
| Grading → column + grade | `_apply_submission_grade` (SQL) |
| Hand-made column | `weeon-teachers/src/lib/teachers/exams-actions.ts` → `addExamColumn` |
| Repair existing rows | `assign_orphan_grade_columns` |
| The matrix | `weeon-teachers/docs/calificaciones-rubros.md`, `grupos.md` |

## See also

- [`aula-virtual.md`](aula-virtual.md) § Assessment lifecycle
- [`calificaciones-rubros.md`](calificaciones-rubros.md) § Calculation rules
- [`mis-evaluaciones.md`](mis-evaluaciones.md) § 3.5 (the same resolver, for reused assessments)
