# Agenda — schedule, events, and exams (teacher web)

*The teacher scheduling surface. Schema is owned by `weeon-tenants`; the student
side is `weeon-mobile`.*

## One line

**Agenda** (`/agenda`) is a hub with three cards: **Horarios** (weekly timetable
with week navigation), **Eventos** (teacher-authored events/exams), and
**Calendario** (placeholder). Exams and events share one table,
`calendar_events`, so they show up on the student home automatically.

## Routes

| Route | Purpose |
| --- | --- |
| `/agenda` | Hub: Horarios / Eventos / Calendario |
| `/horarios?week=YYYY-MM-DD` | Weekly timetable; `week` = any day of the target week |
| `/agenda/eventos` | Create/list/delete group events and exams |

Panel general (`/inicio`) has an **Agenda** card → `/agenda`.

## Where do exams go? (decision)

**One source of truth: `calendar_events`**, and every teacher event is **tied to
a scheduled class period** (`class_lessons`). An exam is an event with
`event_type = 'exam'`, `audience = 'group'`, `group_id` + `subject_id` +
`lesson_id` derived from the chosen lesson. So an event for Matemática can only
target a Matemática period, and the **date must fall on that lesson's weekday**.
This reuses the existing student "Próximos eventos" pipeline and the admin
calendar instead of a parallel table. The **Horarios** week view renders the
selected week's group events on their day.

## Horarios — week navigation

- `searchParams.week` (any `YYYY-MM-DD`) is snapped to that week's **Monday**
  (`lib/dashboard/week.ts`: `parseWeekStart`, `mondayOf`, `addDays`, `isoDate`,
  `weekDates`, `weekdayOf`, `weekRangeLabel` — all pure).
- `WeekNavigator` links to the previous/next week and "Esta semana".
- `ScheduleGrid` receives `weekStart` + the week's `events`; day headers show the
  real date and each day lists its events (amber chip) above the lessons.
- Lessons come from `loadTeacherSchedule()` (recurring `class_lessons`), so
  paging through weeks pages through the semester.
- **Clicking a class tile** opens its preview; the preview has **Agregar
  evento**, which opens the event dialog **prefilled with that class**
  (subject, group, weekday) and **that day's date + times** — so the teacher
  never re-picks what the schedule already knows.

## Eventos — create & delete

- `lib/dashboard/calendar.ts`: `loadMyCalendarEvents()` (authored by this
  teacher) and `loadGroupEventsBetween(startISO, endISO)` (group events for the
  teacher's classes, any author). Rows carry `subjectName`, `groupName`,
  `lessonId`.
- `lib/teachers/calendar-actions.ts`: `createCalendarEvent` / `deleteCalendarEvent`
  (Zod-validated). `createCalendarEvent` loads the **lesson**, verifies the date's
  weekday matches, then inserts with `group_id`/`subject_id`/`lesson_id` from it
  (`created_by` defaults to `auth.uid()`). Mismatched weekday → `agenda.errors.weekday`.
- `components/agenda/event-form-dialog.tsx` is the single form (dialog), reused
  by the **Eventos page** and by each **schedule tile**. It remounts on open, so
  the requested lesson/date seed the fields with no effect-driven reset.
- `/agenda/eventos` shows the **list** with an **Agregar evento** button (opens
  the dialog with a class selector); delete via `ConfirmDialog`. The schedule
  flow opens the same dialog with the class fixed to the clicked period.

## Schema (weeon-tenants)

Three additive migrations:

- `20260913100000_teacher_calendar_events.sql`: `calendar_events.created_by`
  (defaults `auth.uid()`), `subject_id`; `event_type` check extended with `exam`;
  teacher policies (insert `audience='group'` events for a class they
  `teaches_class`; update/delete only rows they authored). Admin policies remain.
- `20260913110000_calendar_event_lesson.sql`: `calendar_events.lesson_id`
  → `class_lessons(id)`.
- `20260913120000_teacher_calendar_event_types.sql`: teachers may only insert
  `event_type in ('exam','activity')` — every other type is school-managed.

Teachers pick only **Examen** or **Actividad** in the form (`TEACHER_EVENT_TYPES`
in `event-form-dialog.tsx`, `z.enum(['exam','activity'])` in the action, and the
RLS check above).

Students read group events through the existing `calendar_events_member_select`
policy (`teaches_class` / `is_enrolled_in_class` / `child_enrolled_in_class`), so
`audience='group'` exams reach the enrolled students.

> Note: the existing policy exposes `audience='teachers'` events to every
> authenticated member (including students). The mobile query narrows to
> `audience in ('school','group')`; fixing the policy is a follow-up.
