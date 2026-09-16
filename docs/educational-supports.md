# Apoyos Eduativos — teacher web

MEP-aligned educational supports. **Schema owner:** `weeon-tenants`
(`docs/educational-supports.md`, migration `20260916100000_student_educational_supports.sql`).

## v1 (live)

| Surface | Route | Behaviour |
| ------- | ----- | --------- |
| **Grupos badge** | `/grupos/[id]` (Calificaciones + Conducta) | Hand-heart + count on student row; amber = pending read |
| **Review dialog** | Same | Lists institutional apoyos; **Confirmo que he leído** → `acknowledge_student_educational_supports` |
| **Grade / conduct gate** | Same | Saving blocked while `needs_review` |
| **Student transcript** | `/estudiantes/[id]` | Read-only **Apoyos Eduativos** panel above grades |

Admin writes apoyos in ERP expediente (`weeon-tenants`). Teachers never edit
institutional rows — they **read and acknowledge** before acting.

### Components

| File | Role |
| ---- | ---- |
| `src/components/educational-supports/support-badge-button.tsx` | Row badge |
| `src/components/educational-supports/support-review-dialog.tsx` | Read + acknowledge |
| `src/components/educational-supports/student-supports-panel.tsx` | Transcript read-only list |
| `src/lib/dashboard/educational-supports.ts` | Server loaders + RPC mappers |
| `src/lib/teachers/educational-support-actions.ts` | Client acknowledge action |

### RPCs (hosted Supabase)

- `list_student_educational_supports(p_student_id)`
- `acknowledge_student_educational_supports(p_student_id)`
- `list_class_educational_support_flags(p_class_id)` → `{ student_id, active_count, needs_review }`

## Tier B (designed — not built)

Per **periodo lectivo** and **asignatura**, teachers will submit MEP *Registro de
apoyos*: checklist (personales, curriculares, acceso, metodología, evaluación)
+ **resultados** + observaciones. Period key = `school_period_key(today)` (same
as grades). Grupos will gate grades/conduct until read **and** period registro are
complete.

Full design: [`weeon-tenants/docs/educational-supports.md`](../../weeon-tenants/docs/educational-supports.md) § Tier B.

## Tier C (future)

ACS / PEI / resolución CAE — hooks only; see canonical doc § Tier C.

## Deploy

Apply `20260916100000_student_educational_supports.sql` on hosted DB before badges
work. Smoke test: [`weeon-tenants/docs/platform-hygiene.md`](../../weeon-tenants/docs/platform-hygiene.md).

## Related

- [`docs/grupos.md`](grupos.md) — gradebook + conduct tabs where badges appear
- [`docs/conducta.md`](conducta.md) — conduct workspace gate
