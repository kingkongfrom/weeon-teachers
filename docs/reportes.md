# Reportes (teacher web)

Teachers file **period reports** from Grupos → **Subir reporte**. That opens the
**report composer** (`/grupos/[id]/reporte?subject=…`), where they preview and
submit a frozen snapshot for the active materia.

## Composer flow

1. **Subir reporte** on the gradebook (disabled until at least one column exists).
2. Composer page shows three **summary cards** (always visible) plus **collapsed
   detail panels** (expand with the chevron row — keeps the page scannable).
3. Optional **Observaciones** textarea → stored in `summary.teacherNotes`.
4. **Subir reporte** upserts `class_reports` and redirects to `/reportes`.

Resubmitting in the same `(group, subject, teacher, period)` replaces the row.

## What each section shows

| Section | Summary (always) | Expandable detail |
| ------- | ---------------- | ----------------- |
| Calificaciones | Student × column grid, promedio, aprobado/reprobado | **Desglose por evaluación** — per-column average, kind badge, coverage bar |
| Conducta | Méritos / faltas / puntos netos per student | **Por categoría** chips; **Registro detallado** — date, category, description |
| Asistencia | MEP counts (P, TJ, TI, AJ, A) per student | **Registro detallado** — dated log with comment; filter Todos / Tardías / Ausencias |

School admins see the same structure read-only at **`/dashboard/reports`**
(`weeon-tenants`).

## Where it appears

| Audience | App | Route |
| -------- | --- | ----- |
| Teacher | weeon-teachers | `/reportes` |
| School admin | weeon-tenants | `/dashboard/reports` |

## Schema (weeon-tenants)

Documented in `weeon-tenants/docs/data-access.md` (`class_reports`).

| Migration | Adds |
| --------- | ---- |
| `20260915150000_class_reports_composer.sql` | `conduct_snapshot`, `attendance_snapshot`, `assignment_titles` |
| `20260915160000_class_reports_detail_logs.sql` | `conduct_log`, `attendance_log`, `assignments_meta` |

Snapshot shapes:

- `grades_snapshot` — `{ assignmentId: { studentId: { mark, maxMarks } } }`
- `conduct_snapshot` — per-student `{ meritCount, demeritCount, netPoints }`
- `conduct_log` — `[{ studentId, occurredOn, kind, category, description, points }]`
- `attendance_snapshot` — per-student MEP counts
- `attendance_log` — non-present `[{ studentId, date, status, comment }]`
- `assignments_meta` — `{ assignmentId: { title, kind, category, points } }`

Reports submitted before the detail-log migration still render summaries; expand
sections only when logs exist (re-submit to capture full detail).

## Implementation (this repo)

| Piece | Path |
| ----- | ---- |
| Composer page | `src/app/(app)/grupos/[id]/reporte/page.tsx` |
| Preview UI (client) | `src/components/reports/report-preview-panels.tsx` |
| Expandable rows | `src/components/reports/report-expandable.tsx` |
| Build snapshot (server) | `src/lib/reports/build-snapshot.ts` |
| Submit action | `src/lib/teachers/reports-actions.ts` |
| Submitted list loader | `src/lib/dashboard/reports.ts` |

**RSC rule:** preview panels call `useT()` / `useLocale()` on the client — do
not pass `t.composer` (contains functions) from server pages into client
components.

Submit always re-reads grades, conduct, and attendance server-side; the client
never sends snapshot JSON.

## Promedio rule

Report **Promedio** is the unweighted mean of per-assignment percentages (same
as the gradebook today). Weighted FINAL is a separate follow-up.

## Related

- Grupos hub: `docs/grupos.md`
- Conduct tab: `docs/conducta.md`
- Asistencia tab: `docs/asistencia-grupos.md`
