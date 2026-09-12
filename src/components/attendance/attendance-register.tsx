"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { DatePicker } from "@/components/ui/date-picker";
import { saveAttendance } from "@/lib/teachers/attendance-actions";
import {
  ATTENDANCE_CODE,
  ATTENDANCE_KIND,
  ATTENDANCE_STATUS_LIST,
  schoolToday,
  shiftDate,
  type AttendanceKind,
  type AttendanceStatus,
} from "@/lib/attendance/model";

export type AttendanceStudent = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const ACTIVE: Record<AttendanceStatus, string> = {
  present: "border-emerald-600 bg-emerald-600 text-white",
  late_justified: "border-amber-500 bg-amber-500 text-white",
  late_unjustified: "border-orange-500 bg-orange-500 text-white",
  absence_justified: "border-sky-600 bg-sky-600 text-white",
  absence_unjustified: "border-red-600 bg-red-600 text-white",
};

const DOT: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500",
  late_justified: "bg-amber-500",
  late_unjustified: "bg-orange-500",
  absence_justified: "bg-sky-500",
  absence_unjustified: "bg-red-500",
};

function displayName(student: AttendanceStudent): string {
  return `${student.lastName} ${student.firstName}`.trim();
}

function defaultMarks(
  students: AttendanceStudent[],
  initial: Record<string, AttendanceStatus>,
): Record<string, AttendanceStatus> {
  const marks: Record<string, AttendanceStatus> = {};
  for (const student of students) {
    marks[student.id] = initial[student.id] ?? "present";
  }
  return marks;
}

/** Dated class register ("Libro de clase"): one row per student, one tap per
 * exception. The date is the day the class is taught (defaults to today in the
 * school's timezone); edits autosave. */
export function AttendanceRegister({
  classId,
  date,
  lessonId,
  students,
  initialMarks,
}: {
  classId: string;
  date: string;
  lessonId: string | null;
  students: AttendanceStudent[];
  initialMarks: Record<string, AttendanceStatus>;
}) {
  const t = useT();
  const a = t.attendance;
  const router = useRouter();
  const [marks, setMarks] = useState(() => defaultMarks(students, initialMarks));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pending = useRef(new Map<string, AttendanceStatus>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function flush() {
    timer.current = null;
    if (pending.current.size === 0) return;
    const entries = Array.from(pending.current.entries()).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    pending.current.clear();
    setSaveState("saving");
    const res = await saveAttendance({ classId, date, lessonId, entries });
    setSaveState(res.ok ? "saved" : "error");
  }

  function scheduleFlush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 600);
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setMarks((current) => ({ ...current, [studentId]: status }));
    pending.current.set(studentId, status);
    scheduleFlush();
  }

  function markAllPresent() {
    const next = defaultMarks(students, {});
    setMarks(next);
    for (const student of students) pending.current.set(student.id, "present");
    scheduleFlush();
  }

  function goto(nextDate: string) {
    const params = new URLSearchParams({ tab: "asistencia", date: nextDate });
    router.push(`/aula-virtual/${classId}?${params.toString()}`);
  }

  const today = schoolToday();
  const counts: Record<AttendanceKind, number> = { present: 0, late: 0, absence: 0 };
  for (const status of Object.values(marks)) counts[ATTENDANCE_KIND[status]] += 1;

  const summaryKinds: { kind: AttendanceKind; dot: string }[] = [
    { kind: "present", dot: DOT.present },
    { kind: "late", dot: DOT.late_unjustified },
    { kind: "absence", dot: DOT.absence_unjustified },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goto(shiftDate(date, -1))}
            aria-label={a.prevDay}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <DatePicker value={date} onChange={(value) => value && goto(value)} />
          <button
            type="button"
            onClick={() => goto(shiftDate(date, 1))}
            aria-label={a.nextDay}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {date !== today ? (
            <button
              type="button"
              onClick={() => goto(today)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              {a.today}
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-foreground/50">
            {saveState === "saving" ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {a.saving}
              </span>
            ) : saveState === "saved" ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                {a.saved}
              </span>
            ) : saveState === "error" ? (
              <span className="text-error">{a.errors.save}</span>
            ) : null}
          </span>
          {students.length > 0 ? (
            <button
              type="button"
              onClick={markAllPresent}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Users className="h-3.5 w-3.5" />
              {a.markAllPresent}
            </button>
          ) : null}
        </div>
      </div>

      <ul className="no-scrollbar flex flex-wrap gap-2">
        {summaryKinds.map(({ kind, dot }) => (
          <li
            key={kind}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70"
          >
            <span className={cn("h-2 w-2 rounded-full", dot)} />
            {a.summary[kind]} · {counts[kind]}
          </li>
        ))}
      </ul>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground/50">{a.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
          {students.map((student) => {
            const status = marks[student.id] ?? "present";
            return (
              <li
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {displayName(student)}
                </span>
                <div
                  role="radiogroup"
                  aria-label={displayName(student)}
                  className="flex shrink-0 items-center gap-1"
                >
                  {ATTENDANCE_STATUS_LIST.map((option) => {
                    const active = status === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={a.statuses[option]}
                        aria-label={a.statuses[option]}
                        onClick={() => setStatus(student.id, option)}
                        className={cn(
                          "h-8 min-w-9 rounded-lg border px-2 text-xs font-bold transition-colors",
                          active
                            ? ACTIVE[option]
                            : "border-border text-foreground/55 hover:bg-surface-muted hover:text-foreground",
                        )}
                      >
                        {ATTENDANCE_CODE[option]}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {ATTENDANCE_STATUS_LIST.map((option) => (
          <li
            key={option}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/50"
          >
            <span className={cn("h-2 w-2 rounded-full", DOT[option])} />
            <span className="font-bold text-foreground/70">{ATTENDANCE_CODE[option]}</span>
            {a.statuses[option]}
          </li>
        ))}
      </ul>
    </div>
  );
}
