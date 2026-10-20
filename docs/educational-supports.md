# Apoyos Eduativos — teacher web

MEP-aligned educational supports. **Schema owner:** `weeon-tenants`
(`docs/educational-supports.md`).

## Live workflow

| Surface | Route | Behaviour |
| ------- | ----- | --------- |
| **Grupos badge** | `/grupos/[id]` (Calificaciones + Conducta) | Hand-heart + count; amber = pending read **or** pending period registro; purple = al día |
| **Workflow dialog** | Same | (1) Read institutional apoyos → acknowledge (2) **Registro de apoyos** for current periodo |
| **Grade / conduct gate** | Same | Saving blocked while `needs_review` **or** `needs_period_registration` |
| **Student transcript** | `/estudiantes/[id]` | **Apoyos Eduativos** panel: read, **Completar / extender** (title, adaptation, new vigencia) and **observaciones**; save clears the group read-acks |
| **Classroom roster (Personas)** | `/aula-virtual/[classId]` | `❤ n` badge next to any student with active supports (same in Tardías) |

Admin writes apoyos in ERP expediente (`weeon-tenants`). Teachers never edit
institutional rows — they **read, acknowledge, and register application** each
periodo lectivo (Circular MEP DVM-AC-003-2013).

### Registro fields (Tier B)

- Descripción del funcionamiento (optional)
- Apoyos aplicados: personales · curriculares · de acceso · metodología · evaluación
- **Resultados** (required)
- Observaciones (optional)

Calificaciones uses the active **materia** tab as `subject_id`. Conducta uses
`subject_id null` (general registro per group).

### Components

| File | Role |
| ---- | ---- |
| `src/components/educational-supports/support-badge-button.tsx` | Row badge (3 states) |
| `src/components/educational-supports/support-workflow-dialog.tsx` | Read + registro form |
| `src/components/educational-supports/student-supports-panel.tsx` | Transcript list + inline edit form (complete/extend + observations) |
| `src/lib/dashboard/educational-supports.ts` | Server loaders + RPC mappers |
| `src/lib/teachers/educational-support-actions.ts` | Client fetch/save actions |

### RPCs (hosted Supabase)

- `list_student_educational_supports(p_student_id, p_subject_id?)`
- `acknowledge_student_educational_supports(p_student_id)`
- `list_class_educational_support_flags(p_class_id, p_subject_id?, p_conduct?)`
- `get_educational_support_registration(...)` / `save_educational_support_registration(...)`

### Migrations

| Tier | Migration |
| ---- | --------- |
| v1 read-ack | `20260916100000_student_educational_supports.sql` |
| Subject scope | `20260917120000_educational_support_subjects.sql` |
| Period registro | `20260917180000_educational_support_registrations.sql` |
## Teacher edit + period extension (current)

- **Editable:** título, adecuación and observaciones. When a student already has
  grades the grade cells are read-only, but these support fields stay editable
  (the form never inherits the grade lock).
- **Vigencia by school period, not a date.** The period selector is filled by
  `fetchSchoolPeriods()` → RPC `list_tenant_academic_periods` (migration
  `20261020001000_support_period_extend.sql`), which returns the tenant's
  effective periods using `calendarSystem` (`academicPeriodOverrides`
  included): MEP → two periodos lectivos; AIS / private trimester → trimestres.
  The stored `effective_until` is the chosen period's end date.
- **Extend only forward:** `extend_student_educational_support(id, until,
  observations)` rejects a period that ends before the current vigencia
  (`range_shortened`). If the support already covers the last period of the
  year the select is disabled and explains why.
- Both RPCs clear the read-acks so every teacher re-reads the edited support
  before grading/conduct.
**Editable surface (final):** only the **vigencia** (next school period) and the
**observaciones**. Título and adecuación are the institution's record and are
displayed read-only inside the form — the teacher does not rewrite them. A
single **Completar / extender** button opens that form (the separate
"Agregar observación" link was removed as redundant). The period picker is the
shared `Dropdown` component (`fitContent`, `size="form"`), not the native
`<select>`, so it matches the portal UI and is ~16rem wide, not full width.
**Labels:** the field reads **Extender adecuación**; the helper line under it
shows the chosen period's dates (`I Periodo · 23/02 – 03/07`) while the menu
lists only the period names, so nothing is repeated. The admin card shows a
single period as `Vigente: I Periodo` instead of `I Periodo — I Periodo`.