# Código de conducta (Grupos)

Teacher-web feature under **Mis grupos → grupo → Código de conducta**
(`/grupos/[id]?tab=conducta`). It is one of three tabs on the group page
(Calificaciones · Asistencia · Código de conducta) and is **separate from the
grade spreadsheet** — méritos and faltas are not mixed into assignment columns.

## What it does

- Teachers record **méritos** and **faltas** per student in a group they teach.
- Each entry: date, type, category, description (required), points (1–5).
- **Summary table** — merit count, demerit count, net points per student.
- **Bitácora** — chronological log, filterable by student or search.
- Teachers may delete entries in groups they teach; school admins have the same
  write scope via RLS.

Net points = sum of signed points (méritos add, faltas subtract).

## Schema (`weeon-tenants`)

Migration: `20260915100000_conduct_records.sql`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `conduct_records.id` | uuid | PK |
| `tenant_id` | uuid | From `classes` on insert |
| `class_id` | uuid | Group |
| `student_id` | uuid | Enrolled student |
| `recorded_by` | uuid | `profiles.id` (defaults to `auth.uid()`) |
| `occurred_on` | date | When the incident happened |
| `kind` | text | `merit` \| `demerit` |
| `category` | text | See categories below |
| `description` | text | 3–1000 chars |
| `points` | smallint | 1–5 (always positive; sign comes from `kind`) |

Categories are **kind-specific** in the UI (DB still accepts the full enum):

| Mérito | Falta |
| ------ | ----- |
| Participación, Colaboración, **Mejora notable**, Respeto, Orden y aseo, Convivencia, Otro | Puntualidad, Respeto, Orden y aseo, Uniforme, Uso de dispositivos, Convivencia, Otro |

`improvement` (Mejora notable) is **merit-only**. `punctuality`, `uniform`, and
`devices` are **demerit-only**. Server actions reject mismatched pairs.

RLS: read = admin / `teaches_class` / enrolled student / linked parent; write =
admin or `teaches_class`. Trial write gate applies.

## Code map (`weeon-teachers`)

| Path | Role |
| ---- | ---- |
| `src/app/(app)/grupos/[id]/page.tsx` | Tab switch (`tab=conducta`) |
| `src/components/grades/grupo-section-tabs.tsx` | Calificaciones / Código de conducta pills |
| `src/components/grades/conduct-workspace.tsx` | UI |
| `src/lib/conduct/model.ts` | Types + summary helper |
| `src/lib/dashboard/conduct.ts` | Server loader |
| `src/lib/teachers/conduct-actions.ts` | `addConductRecord`, `deleteConductRecord` |

## Not built (follow-ups)

- Student mobile read-only view (parent view ships in `weeon-mobile` — see
  `weeon-mobile/docs/conducta.md`).
- Export CSV / include conduct in report composer.
- School-configurable category catalog (today: fixed enum in migration).
- Notify guardians when a falta is recorded.
