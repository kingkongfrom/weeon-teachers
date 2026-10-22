# Panel general (`/inicio`)

*Landing hub after login. Every teacher section is opened from here.*

## One line

**Panel general** is a **morning sheet** modelled on the school ERP's Resumen
(`weeon-tenants` `/dashboard`): date + weather top-left, quick actions in the
middle, three access cards, the current school week, comms shortcuts, and a
**Hoy** block. The full week lives on **`/horarios`**.

## Layout

| Zone | Desktop (`≥1536px` + `≥780px` tall) | Compact (1024–1535px) | Tablet (768–1023px) | Mobile |
| ---- | ----------------------------------- | --------------------- | ------------------- | ------ |
| Date + weather | top-left, absolute | grid row 1 col 1 | grid row 1 col 1 | first |
| Quick actions | centred, absolute | row 1 col 2 | row 2, full width | hidden |
| Access cards | centred, absolute | row 2, full width | row 2, full width | wrapped row |
| Week + comms | centred under cards | row 3 | row 3 | next |
| Hoy panel | under the week | row 4 | row 4 | last |
| Requiere atención | below the sheet | below | below | below |

Responsive logic uses the `morning-desktop` / `morning-compact` /
`morning-tablet` Tailwind variants declared in `src/app/globals.css` — the same
media queries as the ERP. Below `768px` everything stacks in one column.

Shell width: `app-shell.tsx` content is full-width with the same horizontal
gutters as the ERP (`px-4` → `sm:px-5` → `md:px-8`).

## Sheet contents

- **Access cards** — Calificaciones, Agenda, Comunicación. Same
  tint/border/hover treatment as the ERP (`#2b59ff` tint in light,
  `#1D243B` in dark).
- **Quick actions** — Asistencia (`/horarios`) and Nuevo examen
  (`/agenda/calendario`).
- **Week strip** — current Mon–Fri, brand-gradient day number for today, up to
  two event titles per day (`loadEventsBetween`), each cell links to
  `/agenda/calendario?view=day&date=…`.
- **Comms shortcuts** — Mensajes and Chat with live unread badges; they read
  `loadPanelAttention()` server-side.
- **Hoy** — the teacher's lessons for the school-local weekday plus today's
  group events. Only slots assigned to the teacher (`teacher_id`) are shown.

## Hub grid (legacy)

`components/dashboard/hub-quincunx-grid.tsx` — fused 2×2 plus a center rhombus.
Still used by other hubs; **no longer on `/inicio`**.
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

Correo and Chat keep an unread count on the icon when there is one. The landing
no longer renders this grid — the sheet's comms shortcuts badge instead.

`HubModuleCard` remains for other hubs (Agenda).

Agenda card copy: *Horario, eventos y calendario escolar* (the hub owns horarios,
eventos, and calendario — not duplicated on this page).

## Schedule widget

`components/dashboard/teacher-morning.tsx` (`TodayPanel`) — the sheet's Hoy block:

- **Hoy** — lessons for the school-local weekday (`schoolWeekday()` from
  `lib/attendance/model.ts`, timezone `America/Costa_Rica`).
- **Eventos de hoy** — group calendar events for the school-local date.
- **Fin de semana** — message instead of an empty list.
- Each row links to `/aula-virtual/[classId]`.
- **Ver horario completo →** links to `/horarios` (full `ScheduleGrid` +
  `WeekNavigator`).

Do **not** embed the full five-column week grid on `/inicio` — it duplicated
Agenda and pushed the sheet below the fold.

`components/schedule/schedule-upcoming.tsx` still exists for other hosts but is
no longer rendered on `/inicio`.

## Date + weather block

Built into `components/dashboard/teacher-morning.tsx` (`ResumenWeather`), beside
the brand day number:

- Weekday, the brand-gradient day number, and the month + year, in the school
  timezone (`schoolToday()`).
- Live conditions from **MET Norway** (`api.met.no`, free for commercial use, no
  API key) — icon, `°C`, and `Máx · Mín`. A clear or partly-cloudy-sun icon
  renders yellow (`#eab308`); every other condition stays brand blue.
- Coordinates come from the school's `tenants.settings.weatherLatitude` /
  `weatherLongitude` (set in the ERP: Configuración → Institución). Fallback is
  San José. Read-only here — teachers cannot write the tenant row (RLS).
- `lib/weather/load-school-weather.ts` is server-only and `cache()`d; the MET
  Norway request itself is cached 30 minutes and any failure renders no widget.

`components/dashboard/today-weather-block.tsx` is the earlier standalone band;
`/inicio` uses `TeacherMorning` instead.

## Key files

| File | Role |
| ---- | ---- |
| `src/app/(app)/inicio/page.tsx` | Morning sheet + attention strip |
| `components/dashboard/teacher-morning.tsx` | Date, actions, access cards, week, Hoy |
| `lib/weather/met-norway.ts` | MET Norway fetch/parse + symbol map |
| `lib/weather/load-school-weather.ts` | Server loader (school coordinates → weather) |
| `components/dashboard/today-weather-block.tsx` | Standalone date + weather band (unused on `/inicio`) |
| `components/dashboard/hub-quincunx-grid.tsx` | Five-tile grid (other hubs) |
| `components/dashboard/hub-module-card.tsx` | Tone cards on other hubs |
| `components/schedule/schedule-upcoming.tsx` | Legacy Hoy panel (not on `/inicio`) |
| `components/schedule/schedule-grid.tsx` | Full week (used on `/horarios` only) |
| `components/layout/app-shell.tsx` | Main content max width |
| `lib/i18n/messages.ts` | `panel.*`, `panel.sheet.*` strings |

## Verify

```powershell
cd weeon-teachers
npm run dev
# /inicio — date+weather top-left, quick actions centre, 3 access cards,
#           week strip + comms pills, Hoy below
# Ver horario completo → /horarios with full week grid
```
