# Reportes (teacher web)

Teachers file **period reports** from Grupos → **Subir reporte**. That opens the
**report composer** (`/grupos/[id]/reporte?subject=…`), where they preview and
submit a frozen snapshot for the active materia.

## Composer flow

1. **Subir reporte** on the gradebook (disabled until at least one column exists).
2. Composer page: **Calificaciones** fully visible; **Conducta** and **Asistencia**
   collapsed by default (expand to verify before submit).
3. Optional **Observaciones** textarea → stored in `summary.teacherNotes`.
4. **Subir reporte** upserts `class_reports` and redirects to `/reportes`.

Resubmitting in the same `(group, subject, teacher, period)` replaces the row.

One submit still packages grades + conduct + attendance snapshots for school admin.

## What each section shows

| Section | Composer | Submitted `/reportes` detail |
| ------- | -------- | --------------------------- |
| Calificaciones | Full grid + desglose | Full grid + desglose |
| Conducta | Collapsed → expand for tables/logs | Inside collapsed **bundle** |
| Asistencia | Collapsed → expand for tables/logs | Inside collapsed **bundle** |

Daily capture stays in **Grupos** (conducta / asistencia tabs). `/reportes` is an
**archive** of what was sent, not a second workspace.

## `/reportes` list

- Compact **table**: grupo, periodo, materia, promedio, fecha, **Ver**.
- **One** expanded informe at a time (grades-first).
- Link to open the **grupo** for ongoing registration.

School admins read grades on **`/dashboard/reports`** (Calificaciones tab); live
asistencia/conducta on admin **Asistencia** / **Conducta** tabs (`weeon-tenants`).

## Schema (weeon-tenants)

Documented in `weeon-tenants/docs/data-access.md` (`class_reports`).

| Migration | Adds |
| --------- | ---- |
| `20260915150000_class_reports_composer.sql` | `conduct_snapshot`, `attendance_snapshot`, `assignment_titles` |
| `20260915160000_class_reports_detail_logs.sql` | `conduct_log`, `attendance_log`, `assignments_meta` |

## Implementation (this repo)

| Piece | Path |
| ----- | ---- |
| Composer page | `src/app/(app)/grupos/[id]/reporte/page.tsx` |
| Preview UI | `src/components/reports/report-preview-panels.tsx` (`variant`: `composer` \| `archive`) |
| Submitted list | `src/components/reports/reports-submitted-list.tsx` |
| Draft adapter | `src/lib/reports/submitted-view.ts` |
| Submit action | `src/lib/teachers/reports-actions.ts` |
| Loader | `src/lib/dashboard/reports.ts` |

Submit always re-reads grades, conduct, and attendance server-side; the client
never sends snapshot JSON.

## Related

- Grupos hub: `docs/grupos.md`
- Conduct tab: `docs/conducta.md`
- Asistencia tab: `docs/asistencia-grupos.md`
