# Teacher mobile — web extension (agent note)

*Teachers sign in on **two** surfaces: this repo (**weeon-teachers**, desktop
web) and **`weeon-mobile`** (Expo, teacher portal). They are **one product**,
not competitors.*

## One line

**weeon-teachers** is the **authoring and management** home. **weeon-mobile**
(teacher) is the **field companion** — attendance on the floor, chat with
parents, quick mail, schedule/calendar, gallery capture, and notifications.

## For agents working in this repo (web)

- Do **not** assume teachers only use web; mobile will call the **same** RPCs
  and RLS paths you add here.
- **Teacher schedule = assigned slots only** (`loadTeacherSchedule` /
  `class_lessons.teacher_id`). Mobile must use `listAssignedLessons()`, not the
  student `listMyLessons()` path. RLS read scope ≠ Horario display scope — see
  [`agenda.md`](agenda.md) § Horarios — assignment scope and
  [`../../weeon-mobile/docs/teacher-mobile.md`](../../weeon-mobile/docs/teacher-mobile.md)
  § Isolation & scope.
- When you change a **shared contract** (attendance shape, chat RPC, message
  compose payload, calendar event read), update
  [`../../weeon-mobile/docs/teacher-mobile.md`](../../weeon-mobile/docs/teacher-mobile.md)
  in the same change set (or leave an explicit follow-up).
- Do **not** push desktop-only UX into mobile requirements (gradebook grid,
  TipTap editor, report composer, full mailbox).

## For agents working on teacher mobile

Start at **[`weeon-mobile/docs/teacher-mobile.md`](../../weeon-mobile/docs/teacher-mobile.md)**
— web-vs-mobile split, priority table, and implementation checklist.

## Built today on teacher mobile

- **Libro de clase** (`/teacher/asistencia`) — same `attendance_records` +
  `mark_attendance` RPC as web `saveAttendance`; see
  [`weeon-mobile/docs/asistencia.md`](../../weeon-mobile/docs/asistencia.md)
- Gallery capture (`/teacher/galeria`) — see
  [`weeon-mobile/docs/galeria.md`](../../weeon-mobile/docs/galeria.md)
- Shared auth / first password — see [`weeon-mobile/docs/auth.md`](../../weeon-mobile/docs/auth.md)

## Planned complements (web remains canonical)

| Mobile target | Web source of truth |
| ------------- | ------------------- |
| Libro de clase (attendance) | `docs/aula-virtual.md` § Asistencia — **also on mobile** `/teacher/asistencia` |
| Chat with guardians | `docs/comunicacion.md` § Chat |
| Correo compose / reply | `docs/comunicacion.md` § Correo |
| Horario + upcoming events | `docs/agenda.md` — **`listAssignedLessons()`** on mobile, same `teacher_id` filter as web |

Parent **Chat** on mobile is already live; teacher **Chat** on mobile is the
natural next step using the same `chat_*` schema and Realtime patterns as web
(`lib/dashboard/chat.ts`, `lib/supabase/browser.ts` cookie + `setAuth` lessons).
