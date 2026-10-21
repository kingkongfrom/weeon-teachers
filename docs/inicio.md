# Panel general (`/inicio`)

*Landing hub after login. Every teacher section is opened from here.*

## One line

**Panel general** is a **launch pad**. A fused **five-tile grid** (2×2 plus a
center diamond) links to the main modules. A compact **Hoy / Próximas clases**
column shows today's timetable. The full week lives on **`/horarios`**.

## Layout

| Zone | Desktop (`lg+`) | Mobile |
| ---- | ----------------- | ------ |
| Header | School name + **Panel general** title | Same |
| Attention | **Requiere atención** — por evaluar, justificaciones, chat/mensajes sin leer (hidden when none) | Same |
| Left | **Quincunx** — 2×2 corners + center diamond | Same square |
| Right | **ScheduleUpcoming** — today + up to 3 later-week classes | Below the grid |

Shell width: `app-shell.tsx` uses `max-w-[77rem]`.

## Hub grid

`components/dashboard/hub-quincunx-grid.tsx` — fused 2×2 plus a center rhombus.
Tiles use the shared hub tones (the same washes and icon chips as grupos and
the schedule): Aula blue, Calificaciones purple, Agenda yellow, Correo rose,
Chat green. Light surface, soft accent wash, icon centered over its label.

| Tile | Place | Route | Tone |
| ---- | ----- | ----- | ---- |
| Aula virtual | Top left | `/aula-virtual` | blue |
| Calificaciones | Top right | `/grupos` | purple |
| Agenda | Bottom left | `/agenda` | yellow |
| Correo | Bottom right | `/comunicacion/mensajes` | rose |
| Chat | Center diamond | `/comunicacion/chat` | green |

Correo and Chat keep an unread count on the icon when there is one.

`HubModuleCard` remains for other hubs (Agenda).

Agenda card copy: *Horario, eventos y calendario escolar* (the hub owns horarios,
eventos, and calendario — not duplicated on this page).

## Schedule widget

`components/schedule/schedule-upcoming.tsx` (right column on `/inicio`):

- **Requiere atención** (`panel-attention.tsx`) — links to por evaluar, unread
  chat, unread messages inbox; driven by `loadPanelAttention()`.
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

## Date + weather block

`components/dashboard/today-weather-block.tsx`, rendered under the page title
and school name (shares the Resumen design used in `weeon-tenants`):

- Weekday, the brand-gradient day number, and the month + year, in the school
  timezone (`schoolToday()`).
- Live conditions from **MET Norway** (`api.met.no`, free for commercial use, no
  API key) — icon, `°C`, and `Máx · Mín`. A clear-sky icon renders yellow
  (`#eab308`); every other condition stays brand blue.
- Coordinates come from the school's `tenants.settings.weatherLatitude` /
  `weatherLongitude` (set in the ERP: Configuración → Institución). Fallback is
  San José. Read-only here — teachers cannot write the tenant row (RLS).
- `lib/weather/load-school-weather.ts` is server-only and `cache()`d; the MET
  Norway request itself is cached 30 minutes and any failure renders no widget.

## Key files

| File | Role |
| ---- | ---- |
| `src/app/(app)/inicio/page.tsx` | Five-tile hub + Hoy column |
| `components/dashboard/today-weather-block.tsx` | Date + live weather band |
| `lib/weather/met-norway.ts` | MET Norway fetch/parse + symbol map |
| `lib/weather/load-school-weather.ts` | Server loader (school coordinates → weather) |
| `components/dashboard/hub-quincunx-grid.tsx` | Five-tile home grid |
| `components/dashboard/hub-module-card.tsx` | Tone cards on other hubs |
| `components/schedule/schedule-upcoming.tsx` | Today / upcoming compact list |
| `components/schedule/schedule-grid.tsx` | Full week (used on `/horarios` only) |
| `components/layout/app-shell.tsx` | Main content max width |
| `lib/i18n/messages.ts` | `panel.*` strings |

## Verify

```powershell
cd weeon-teachers
npm run dev
# /inicio — five-tile grid left, Hoy panel right on wide screen
# Ver horario completo → /horarios with full week grid
# Agenda card → /agenda hub (not duplicate horario on inicio)
```
