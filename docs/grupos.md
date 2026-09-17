# Mis grupos — group workspace

Teacher-web surface for **one class the teacher teaches**: grades, attendance
history, and conduct. Entry: **Inicio → Calificaciones → grupo** or
**Aula virtual → Calificaciones tab** (same route).

**Route:** `/grupos/[id]`  
**Query:** `?subject=<subjectId>` (Calificaciones materia), `?tab=asistencia`,
`?tab=conducta` (legacy `?tab=tardias` → Asistencia).

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
- **Asistencia panel:** read-only cumulative **A · AJ · TI · TJ** counts per
  student (all dates), loaded by `loadClassAttendanceCounts()` — same source
  table as the Asistencia tab, different presentation (four codes vs tardías only).
- **CSV export** includes the Asistencia column.

Full gradebook behaviour: [`docs/aula-virtual.md`](aula-virtual.md) § Gradebook.

## Asistencia tab vs Aula virtual

| Surface | Route | Role |
| ------- | ----- | ---- |
| **Libro de clase** (dated register) | `/aula-virtual/[classId]?tab=asistencia` | **Write** P / TJ / TI / AJ / A for one day |
| **Grupos → Asistencia** | `/grupos/[id]?tab=asistencia` | **Read** accumulated TJ/TI log + summary |
| **Gradebook panel** | `/grupos/[id]` (Calificaciones tab) | **Read** A/AJ/TI/TJ totals per student |

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
