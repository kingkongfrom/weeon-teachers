# Agenda — schedule, events, and exams (teacher web)

*The teacher scheduling surface. Schema is owned by `weeon-tenants`; the student
side is `weeon-mobile`.*

## One line

**Agenda** (`/agenda`) is a hub with three cards: **Horarios** (weekly timetable
with week navigation), **Próximos eventos** (read-only list of upcoming
institution events), and **Calendario** (month/week/day/agenda calendar:
institution events + the teacher's aula virtual exams).
Teachers add **exams and activities** from a class tile in the schedule popover
(not from the events page).

## Routes

| Route | Purpose |
| --- | --- |
| `/agenda` | Hub: Horarios / Próximos eventos / Calendario |
| `/horarios?week=YYYY-MM-DD` | Weekly timetable; `week` = any day of the target week |
| `/agenda/eventos` | Read-only upcoming events (institution calendar) |
| `/agenda/calendario?view=month\|week\|day\|agenda&date=YYYY-MM-DD` | Teacher calendar; `date` is the anchor day (defaults to today), `view` defaults to month |

Panel general (`/inicio`) has an **Agenda** card → `/agenda`; its **Horario de la
semana** section now shows the **current week's dates** like `/horarios`.

## Horarios — week navigation + exams

- `searchParams.week` (any `YYYY-MM-DD`) is snapped to that week's **Monday**
  (`lib/dashboard/week.ts`: `parseWeekStart`, `mondayOf`, `addDays`, `isoDate`,
  `weekDates`, `weekdayOf`, `weekRangeLabel` — all pure).
- `WeekNavigator` links to the previous/next week and "Esta semana".
- `ScheduleGrid` receives `weekStart` + the week's `events`; day headers show the
  real date and each day lists its events (amber chip) above the lessons.
- **Each class tile shows room and an exam/activity indicator**; clicking it opens
  a preview with the day, time, **room**, students, the **exams/activities**
  attached to that class, and **Agregar examen o actividad**.
- Preview shortcuts preserve the **materia** from the clicked lesson
  (`gradebookSubjectId` = `subjects.id` or `lesson:<class_lessons.id>`):
  - **Abrir Aula Virtual** → `/aula-virtual/[classId]?subject=…&tab=trabajo`
  - **Calificaciones** → `/grupos/[classId]?subject=…`
  - Today only: **Abrir registro** → `/aula-virtual/[classId]?tab=asistencia&lesson=[id]`
- Lessons come from `loadTeacherSchedule()` (recurring `class_lessons`), so
  paging through weeks pages through the semester.

## Próximos eventos — read only

- `loadUpcomingEvents()` (`lib/dashboard/calendar.ts`): direct RLS `select` on
  `calendar_events` with `date >= today`, ordered by date/time. RLS shows the
  teacher school-wide, teacher-facing, and their-group events. The page renders a
  card with a title + orange underline, the event list, and a friendly empty
  message (no blank page). **No create/delete UI and no server actions here.**
- The week view overlays the selected week's events via
  `loadGroupEventsBetween(startISO, endISO)`.

## Calendario — month / week / day / agenda

The calendar **mirrors the school ERP design** (`weeon-tenants`
`components/dashboard/calendar-client.tsx`) adapted to the teacher surface.

It aggregates **two sources**:

- `loadEventsBetween(startISO, endISO)` — the institution calendar
  (`calendar_events`, same RLS as `loadUpcomingEvents`: school-wide,
  teacher-facing and the teacher's groups).
- `loadExamDueBetween(startISO, endISO)` — the teacher's **aula virtual exams**
  (`assessments` where `kind = 'exam'` and `due_at` is set) for their classes.
  Homeworks are intentionally **not** shown. Because `due_at` is a
  `timestamptz`, the query is padded a day each side and rows are kept by their
  **school-local** date via `lib/dashboard/timezone.ts` (`America/Costa_Rica`),
  so a late-evening due date lands on the right day.

`lib/dashboard/month.ts` holds the pure helpers: `parseCalendarView`,
`parseAnchor`, `rangeFor`, `shiftAnchor`, `monthCells` (Monday-first 42-day
grid), `isSameDay`, `minutesFromMidnight`, `timeBlockOffset`,
`layoutTimedRanges` (overlap packing for the time grid), `WEEK_START_HOUR` /
`WEEK_END_HOUR`, and the `AGENDA_DAYS` span. The grid is **Monday–Friday only**
(no weekends): `monthCells` returns whole Mon–Fri rows and the week/agenda views
skip Sat/Sun.

`components/agenda/calendar-view.tsx` is a **client** component (navigation
pushes `?view=` / `?date=`; selection, search and type filters are local state):

- Toolbar: prev / Hoy / next + title, a **Mes · Semana · Día · Agenda**
  segmented switcher, a **Tipos** filter (per event type — including exams),
  and search.
- **Mes** — Monday-first grid; each day shows up to three chips + `+N`; the day
  number opens the day view, clicking a cell selects it (brand ring).
- **Semana** — a time grid (07:00–19:00, `HOUR_HEIGHT` 52) with an all-day row,
  overlapped timed blocks packed into columns, and a "now" line.
- **Día** — the same time grid for one day (`DAY_HOUR_HEIGHT` 64).
- **Agenda** — a 14-day list of only the days that have items.

Institution events are colour-coded by type (`STYLES` in the component); aula
virtual exams use the **rose** tone. All times are 24h. Read-only — no
create/delete here. There is no legend/sidebar (the grid carries the colours).

## Adding exams/activities (from the schedule)

- `components/agenda/event-form-dialog.tsx` is the single form, opened from a
  class tile's preview. **Subject, group, weekday, time and the date are fixed**
  by the tile that was clicked (shown read-only), so the form only asks for the
  **type** (Examen / Actividad — other types are school-managed), a title,
  location and notes.
- `lib/teachers/calendar-actions.ts#createCalendarEvent` loads the **lesson**,
  verifies the date's weekday matches, then inserts with
  `group_id`/`subject_id`/`lesson_id` from it (`created_by` defaults to
  `auth.uid()`). Mismatched weekday → `agenda.errors.weekday`.
- `lib/agenda/lesson-choice.ts` defines the `LessonChoice` the tile builds from
  its `TeacherLesson`.

## Schema (weeon-tenants)

Three additive migrations restore teacher authoring:

- `20260913100000_teacher_calendar_events.sql`: `created_by` (default
  `auth.uid()`), `subject_id`; `event_type` check gains `exam`; teacher
  insert/update/delete policies for `audience='group'` events on classes they
  teach (edit only their own).
- `20260913110000_calendar_event_lesson.sql`: `lesson_id` → `class_lessons(id)`.
- `20260913120000_teacher_calendar_event_types.sql`: teacher inserts limited to
  `event_type in ('exam','activity')`.

Students read group/school events through the existing
`calendar_events_member_select` policy, so a teacher's group exam reaches that
group's students as an upcoming event on mobile (`/student/eventos`).
