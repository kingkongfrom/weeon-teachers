# Panel general (`/inicio`)

*Landing hub after login. Every teacher section is opened from here.*

## One line

**Panel general** is a **launch pad**, not a second horario page. Four tone
cards link to the main modules; a compact **Hoy / Próximas clases** widget shows
today's timetable at a glance. The full week grid lives on **`/horarios`**
(reached via **Agenda → Horarios** or **Ver horario completo**).

## Layout

| Zone | Desktop (`lg+`) | Mobile |
| ---- | ----------------- | ------ |
| Header | School name + **Panel general** title | Same |
| Attention | **Requiere atención** — por evaluar, chat/circulares sin leer (hidden when none) | Same |
| Left | 2×2 **hub module cards** | Stacked cards (1 col → 2 col `sm`) |
| Right | **ScheduleUpcoming** — today + up to 3 later-week classes | Below cards |

Shell width: `app-shell.tsx` uses `max-w-[77rem]` (~20% wider than the former
`max-w-5xl`) so cards and the schedule panel breathe on desktop.

## Hub cards

Shared component: `components/dashboard/hub-module-card.tsx` — tone chip +
gradient icon square, aligned with `weeon-tenants` hub tiles
(`lib/dashboard/tones.ts` → `hubTonePill`, `TONE_AVATAR`).

| Card | Route | Stat |
| ---- | ----- | ---- |
| Aula virtual | `/aula-virtual` | N clases |
| Calificaciones | `/grupos` | N materias |
| Agenda | `/agenda` | N clases esta semana |
| Comunicación | `/comunicacion` | N sin leer (when unread chat + inbox) |

Agenda card copy: *Horario, eventos y calendario escolar* (the hub owns horarios,
eventos, and calendario — not duplicated on this page).

## Schedule widget

`components/schedule/schedule-upcoming.tsx` (server component):

- **Requiere atención** (`panel-attention.tsx`) — links to por evaluar, unread
  chat, unread circulares inbox; driven by `loadPanelAttention()`.
- **Hoy** — lessons for the school-local weekday (`schoolWeekday()` from
  `lib/attendance/model.ts`, timezone `America/Costa_Rica`). Today's rows include
  an **Asistencia** shortcut to the Libro de clase **only while that period is
  in progress** (school-local start–end time).
- **Eventos de hoy** — group calendar events for the school-local date.
- **Fin de semana** — message instead of an empty list.
- **Próximas clases** — up to three lessons later in the same Mon–Fri week.
- Each row links to `/aula-virtual/[classId]`; lesson colours reuse schedule
  tone mapping from `lesson-card.tsx`.
- **Ver horario completo →** links to `/horarios` (full `ScheduleGrid` +
  `WeekNavigator`).

Do **not** embed the full five-column week grid on `/inicio` — it duplicated
Agenda and pushed the hub below the fold.

## Key files

| File | Role |
| ---- | ---- |
| `src/app/(app)/inicio/page.tsx` | Loads grupos + schedule; renders hub + widget |
| `components/dashboard/hub-module-card.tsx` | Hub tile |
| `components/schedule/schedule-upcoming.tsx` | Today / upcoming compact list |
| `components/schedule/schedule-grid.tsx` | Full week (used on `/horarios` only) |
| `components/layout/app-shell.tsx` | Main content max width |
| `lib/i18n/messages.ts` | `panel.*` strings |

## Verify

```powershell
cd weeon-teachers
npm run dev
# /inicio — 2×2 cards left, Hoy panel right on wide screen
# Ver horario completo → /horarios with full week grid
# Agenda card → /agenda hub (not duplicate horario on inicio)
```
