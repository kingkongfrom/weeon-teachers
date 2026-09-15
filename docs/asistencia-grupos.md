# Asistencia (Grupos)

Teacher-web feature under **Mis grupos → grupo → Asistencia**
(`/grupos/[id]?tab=asistencia`). It sits alongside **Calificaciones** and **Código
de conducta** on the group page.

## What it does

- **Read-only** aggregated log of **TJ** (tardía justificada) and **TI**
  (tardía injustificada) from the shared `attendance_records` table.
- **Summary table** — TJ, TI, and total tardías per student.
- **Bitácora** — chronological list with optional teacher comments, filterable
  by student or search.
- **Pasar asistencia** links to **Aula virtual → Asistencia**
  (`/aula-virtual/[classId]?tab=asistencia`), where the dated register lives.
  This tab does **not** duplicate the register UI.

The gradebook **Asistencia** column still shows all four ausencia codes (A, AJ,
TI, TJ) as a compact summary; this tab focuses on late arrivals.

Legacy URL `?tab=tardias` still resolves to the same view.

## Data

No dedicated migration — reuses `attendance_records` from
`20260912180000_attendance_ausencias.sql` in `weeon-tenants`.

Loader: `loadClassTardias()` in `src/lib/dashboard/attendance.ts`.

UI: `src/components/grades/tardias-workspace.tsx` (`AttendanceGroupWorkspace`).
