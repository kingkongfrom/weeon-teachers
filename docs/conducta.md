# Código de conducta (Grupos tab)

Teacher-web **méritos / faltas** log for one group. Separate from the grade
spreadsheet and from attendance.

**Route:** `/grupos/[id]?tab=conducta`  
**Hub doc:** [`grupos.md`](grupos.md)

## User flow

1. Open **Mis grupos → [grupo] → Código de conducta**.
2. **Resumen por estudiante** — merit count, demerit count, net points.
3. **Bitácora** — filter by student or search; delete own entries.
4. **Registrar anotación** — modal: student, date, kind, category, description,
   points 1–5.

Net points = sum of signed points (méritos add, faltas subtract).

## Categories (UI-enforced)

Categories are **kind-specific** (DB accepts full enum; server actions validate):

| Mérito | Falta |
| ------ | ----- |
| Participación, Colaboración, **Mejora notable**, Respeto, Orden y aseo, Convivencia, Otro | Puntualidad, Respeto, Orden y aseo, Uniforme, Uso de dispositivos, Convivencia, Otro |

- `improvement` — merit-only  
- `punctuality`, `uniform`, `devices` — demerit-only  

## Schema (`weeon-tenants`)

Migration: **`20260915100000_conduct_records.sql`**

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `tenant_id` | uuid | From `classes` on insert (trigger) |
| `class_id` | uuid | Group |
| `student_id` | uuid | Enrolled student |
| `recorded_by` | uuid | `profiles.id` (defaults `auth.uid()`) |
| `occurred_on` | date | Incident date |
| `kind` | text | `merit` \| `demerit` |
| `category` | text | See enum in migration |
| `description` | text | 3–1000 chars |
| `points` | smallint | 1–5 (positive; sign from `kind`) |

**RLS**

- **Read:** admin, `teaches_class`, enrolled student, linked parent/guardian
  (`can_view_student`).
- **Write:** admin or `teaches_class` (+ trial write gate).

**Mobile read RPC:** `list_student_conduct(p_student_id uuid default null)` —
`20260915110000_student_conduct.sql`. Documented in
`weeon-mobile/docs/conducta.md` and `weeon-tenants/docs/conduct-mobile-access.md`.

## Code map (`weeon-teachers`)

| Path | Role |
| ---- | ---- |
| `src/app/(app)/grupos/[id]/page.tsx` | Loads conduct when `tab=conducta` |
| `src/components/grades/grupo-section-tabs.tsx` | Three tab pills |
| `src/components/grades/conduct-workspace.tsx` | Summary + bitácora + add/delete |
| `src/lib/conduct/model.ts` | Types, categories, `summarizeConduct()` |
| `src/lib/dashboard/conduct.ts` | `loadClassConduct()` |
| `src/lib/teachers/conduct-actions.ts` | `addConductRecord`, `deleteConductRecord` |
| `src/components/ui/dropdown.tsx`, `date-picker.tsx` | Form controls |

## Cross-app

| App | Role |
| --- | ---- |
| **weeon-teachers** | Write + read (this tab) |
| **weeon-mobile** (parent) | Read-only on Notas → Código de conducta |
| **weeon-tenants** | Schema + RLS owner |

## Not built

- CSV export / include in report composer.
- Push/email when a falta is recorded.
- School-configurable category catalog (fixed enum today).
- Student mobile tab (parent view ships).
