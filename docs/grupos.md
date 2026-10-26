# Mis grupos — group workspace

Teacher-web surface for **one class the teacher teaches**: grades, attendance
history, and conduct. Entry: **Inicio → Calificaciones → grupo** or
**Aula virtual → Calificaciones tab** (same route).

**Route:** `/grupos/[id]`  
**Query:** `?subject=<subjectId>` (Calificaciones materia), `?tab=asistencia`,
`?tab=conducta` (legacy `?tab=tardias` → Asistencia).

## List page (`/grupos`)

`GrupoCard` (`components/grupos/grupo-card.tsx`) mirrors the Aula virtual
`ClassCard` layout: green banner header (group + year), school · section,
subject chips, student count, footer icon shortcuts (Calificaciones · Asistencia ·
Código de conducta). Data from `loadTeacherGrupos()` + `loadSchoolName()`.

## Three tabs (one group page)

| Tab | URL | Write? | Purpose |
| --- | --- | ------ | ------- |
| **Calificaciones** | `/grupos/[id]?subject=…` | Yes (marks) | Gradebook spreadsheet — `GradebookWorkspace` |
| **Asistencia** | `/grupos/[id]?tab=asistencia` | No (read-only here) | TJ/TI history + link to take attendance |
| **Código de conducta** | `/grupos/[id]?tab=conducta` | Yes (méritos/faltas) | Conduct log — `ConductWorkspace` |

Tab pills: `src/components/grades/grupo-section-tabs.tsx`  
Page loader: `src/app/(app)/grupos/[id]/page.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Todos los grupos                                         │
│  [ Calificaciones ] [ Asistencia ] [ Código de conducta ]   │
├─────────────────────────────────────────────────────────────┤
│  Active workspace (gradebook | attendance log | conduct)    │
└─────────────────────────────────────────────────────────────┘
```

## Calificaciones (gradebook)

- **Component:** `src/components/grades/gradebook-workspace.tsx`
- **Data:** `assignments` (columns) + `grades` (cells), per `subject_id` tab from
  `class_lessons`.
- **Grades only:** the gradebook shows no attendance — the old read-only
  Asistencia panel and its CSV column were removed. Ausencias live in the
  Asistencia tab (`?tab=asistencia`).
- **Header:** two sticky rows — an upper **group per column type** (columns are
  sorted by type, so a type is never repeated) and a labels row. Cells are
  tinted pills using the shared marketing palette (green ≥ 70, amber 50–69,
  rose < 50, purple FINAL). Columns are auto-titled `Tipo n`; the dialog asks
  for **Puntos** (max score, e.g. 10 or 100) and type. Headers show **`10 pts`**;
  cells show the raw mark (tooltip: `7 de 10 (70%)`). **Final** and **Prom. %**
  are percentage averages (0–100). A **three-step density** toggle widens the columns
  and lengthens the labels: Compacto `TRAB 1` → Normal `Trabajo 1` → Ampliada
  `Trabajo en clase 1`.
- **CSV export** covers students × grade columns + FINAL (no attendance).
- **Points are frozen once graded.** After the first grade in a column, its
  maximum (assignments.points) cannot change — server action and DB trigger
  assignments_freeze_points_after_grades (20261019223000_freeze_submitted_assessments.sql).
  Title and rubro stay editable; to change the weighting, create a new column.
  Before the first grade both are edited **in the header**: click the title or
  the `100 pts` line (Enter saves, Esc cancels); the points line is disabled
  with an explanatory tooltip once the column has marks.
- **Scoreboard, not a spreadsheet.** Every number on Calificaciones comes from
  one model (`src/lib/dashboard/scoreboard.ts`): a rubro `Total` shows the
  points earned **and** the grade (`28 / 30 · 93%`), the footer shows the class
  points average and grade, FINAL is the weighted grade in %, and the
  bottom-right `Promedio` is the class average of FINAL. No %/Pts switch — the
  format belongs to the column.
- **Dirección view.** A summary strip shows promedio del grupo, aprobación
  (≥ 70 %), rango and students without a grade; rows can be sorted by name or
  final grade and filtered to **Pendientes** / **En riesgo**. A student who can
  no longer reach 70 % with the remaining weight is flagged.
- **Phones (< 768 px)** get cards per student (final, risk, one bar per rubro)
  instead of the matrix; **Tarjetas / Tabla** switches back to the grid.
  **iPad (portrait or landscape) and desktop always get the full matrix**, grade
  entry included. Toolbar icons collapse, filters scroll sideways, and dialogs
  are dvh bottom sheets with safe-area padding for iOS Safari.
- **Imprimir** prints a landscape PDF for dirección (chrome and sticky offsets
  removed, header with grupo · materia · rubros · leyenda). The CSV carries the
  same numbers, including a per-rubro points/grade row and a footer.

Full gradebook behaviour: [`docs/aula-virtual.md`](aula-virtual.md) § Gradebook.

**Rubros ponderados (built, P1–P4):** each rubric (Tareas, Exámenes, Proyectos
+ teacher-created ones) carries a **peso** that splits the subject final. The
matrix header shows `Tareas · 30%`, the footer shows the rubro grade, and FIN
is a renormalised weighted mean computed by one shared pure module
(`src/lib/dashboard/scoreboard.ts`, re-exporting
`src/lib/dashboard/grade-weights.ts`). Column **puntos** keep their meaning
*inside* a rubro. Rubros are edited **inline in the header** (click the name or
the weight, Enter saves, Esc cancels; dashed `+ Nuevo rubro` cell; drag the grip
to reorder blocks) — `components/grades/rubro-header-cell.tsx`. The dialog
(`rubric-dialog.tsx`) remains for the first-run wizard, column reassignment,
archive/restore and reset. First open of a subject without rubros shows a
two-step wizard (weights → column points) that is skippable. Reports still use the
column average until the reports sprint (banner in the gradebook).
Requirements, rules, schema and phases:
[`docs/calificaciones-rubros.md`](calificaciones-rubros.md).


## Asistencia tab vs Aula virtual

| Surface | Route | Role |
| ------- | ----- | ---- |
| **Libro de clase** (dated register) | `/aula-virtual/[classId]?tab=asistencia` | **Write** P / TJ / TI / AJ / A for one day |
| **Grupos → Asistencia** | `/grupos/[id]?tab=asistencia` | **Read** accumulated TJ/TI log + summary |

Teachers always **record** attendance in aula virtual (or from a lesson card →
`?tab=asistencia&lesson=<id>`). The Grupos tab never duplicates
`AttendanceRegister`.

Detail: [`docs/asistencia-grupos.md`](asistencia-grupos.md).

## Código de conducta

Separate from grades and attendance — own table `conduct_records`.

Detail: [`docs/conducta.md`](conducta.md).

## Apoyos Eduativos

When a student has **active institutional apoyos** (registered by admin in ERP
expediente), each row on **Calificaciones** and **Conducta** shows a hand-heart
badge. Teachers must (1) confirm they read the apoyos and (2) submit the
**Registro de apoyos** for the current periodo lectivo before saving grades or
conduct. Amber badge = pending read or pending registro; purple = al día for the
period. Read-ack resets if admin edits apoyos; a new registro is required each
period.

Student transcript (`/estudiantes/[id]`) shows apoyos **read-only** — use Grupos
for the workflow.

Detail: [`docs/educational-supports.md`](../../weeon-tenants/docs/educational-supports.md).

| Feature | Migration |
| ------- | --------- |
| Apoyos v1 | `20260916100000_student_educational_supports.sql` |
| Registro Tier B | `20260917180000_educational_support_registrations.sql` |

## MEP attendance codes (shared)

Defined in `src/lib/attendance/model.ts` (language-independent codes):

| Code | DB status | Meaning |
| ---- | --------- | ------- |
| P | `present` | Presente |
| TJ | `late_justified` | Tardía justificada |
| TI | `late_unjustified` | Tardía injustificada |
| AJ | `absence_justified` | Ausencia justificada |
| A | `absence_unjustified` | Ausencia no justificada |

School timezone for “today”: `America/Costa_Rica`.

## Schema owner (`weeon-tenants`)

| Feature | Table / RPC | Migration |
| ------- | ------------- | --------- |
| Attendance register | `attendance_records` | `20260912180000_attendance_ausencias.sql` |
| Attendance comments | `attendance_records.comment` | `20260914200000_attendance_comment.sql` |
| Conduct | `conduct_records` | `20260915100000_conduct_records.sql` |
| Apoyos Eduativos | `student_educational_supports`, `student_educational_support_reviews` | `20260916100000_student_educational_supports.sql` |

Mobile parent read of conduct: `list_student_conduct` —
`20260915110000_student_conduct.sql` (see `weeon-mobile/docs/conducta.md`).

## Deploy checklist

Apply in **weeon-tenants** before using conduct or the mobile parent tab:

1. `20260912180000_attendance_ausencias.sql` (if not already on project)
2. `20260915100000_conduct_records.sql`
3. `20260915110000_student_conduct.sql`
4. `20260915120000_guardian_student_view.sql` (guardian JSON → grades/conduct)
5. `20260915150000_class_reports_composer.sql` (report composer snapshots)
6. `20260915160000_class_reports_detail_logs.sql` (dated conduct/asistencia logs)
7. `20260916100000_student_educational_supports.sql` (Apoyos Eduativos badges + read-ack)

Then `notify pgrst, 'reload schema'` or wait for PostgREST cache refresh.

**Report composer** — `/grupos/[id]/reporte` (from **Subir reporte**): preview
grades + conduct + asistencia, optional notes, submit to `/reportes`. See
`docs/reportes.md`.

## Not built (follow-ups)

- Export conduct or tardías to CSV from Grupos tabs.
- Notify guardians on new falta or ausencia.
- Student mobile read-only conduct (reuse parent `ConductView`).
