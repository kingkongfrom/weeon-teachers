# Agenda — schedule, events, and exams (teacher web)

*The teacher scheduling surface. Schema is owned by `weeon-tenants`; the student
side is `weeon-mobile`.*

## One line

**Agenda** (`/agenda`) is a hub with three cards: **Horarios** (weekly timetable
with week navigation), **Próximos eventos** (read-only list of upcoming
institution events), and **Calendario** (placeholder). Teachers add **exams and
activities** from a class tile in the schedule popover (not from the events
page).

## Routes

| Route | Purpose |
| --- | --- |
| `/agenda` | Hub: Horarios / Próximos eventos / Calendario |
| `/horarios?week=YYYY-MM-DD` | Weekly timetable; `week` = any day of the target week |
| `/agenda/eventos` | Read-only upcoming events (institution calendar) |

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
