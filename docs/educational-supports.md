# Apoyos Eduativos — teacher web

MEP-aligned educational supports. **Schema owner:** `weeon-tenants`
(`docs/educational-supports.md`).

## Live workflow

| Surface | Route | Behaviour |
| ------- | ----- | --------- |
| **Grupos badge** | `/grupos/[id]` (Calificaciones + Conducta) | Hand-heart + count; amber = pending read **or** pending period registro; purple = al día |
| **Workflow dialog** | Same | (1) Read institutional apoyos → acknowledge (2) **Registro de apoyos** for current periodo |
| **Grade / conduct gate** | Same | Saving blocked while `needs_review` **or** `needs_period_registration` |
| **Student transcript** | `/estudiantes/[id]` | Read-only **Apoyos Eduativos** panel (use Grupos for workflow) |

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
| `src/components/educational-supports/student-supports-panel.tsx` | Transcript read-only list |
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
