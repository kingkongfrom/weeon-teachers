"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { saveAttendance } from "@/lib/teachers/attendance-actions";
import {
  ATTENDANCE_CODE,
  ATTENDANCE_COMMENT_MAX,
  ATTENDANCE_KIND,
  ATTENDANCE_STATUS_LIST,
  attendanceAllowsComment,
  schoolToday,
  shiftDate,
  type AttendanceEntry,
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
  initial: Record<string, AttendanceEntry>,
): Record<string, AttendanceEntry> {
  const marks: Record<string, AttendanceEntry> = {};
  for (const student of students) {
    marks[student.id] = initial[student.id] ?? { status: "present", comment: null };
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
  initialMarks: Record<string, AttendanceEntry>;
}) {
  const t = useT();
  const a = t.attendance;
  const router = useRouter();
  const marksRef = useRef(defaultMarks(students, initialMarks));
  const [marks, setMarks] = useState(marksRef.current);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGeneration = useRef(0);

  function applyMark(studentId: string, patch: Partial<AttendanceEntry>): AttendanceEntry | null {
    const previous = marksRef.current[studentId] ?? { status: "present", comment: null };
    const next: AttendanceEntry = { ...previous, ...patch };
    const updated = { ...marksRef.current, [studentId]: next };
    marksRef.current = updated;
    setMarks(updated);
    return next;
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current.size > 0) void flush();
    };
  }, []);

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const studentIds = Array.from(pending.current);
    pending.current.clear();
    if (studentIds.length === 0) return;

    const entries = studentIds.map((studentId) => {
      const mark = marksRef.current[studentId] ?? { status: "present" as const, comment: null };
      return { studentId, status: mark.status, comment: mark.comment };
    });

    const generation = ++saveGeneration.current;
    setSaveState("saving");
    const res = await saveAttendance({ classId, date, lessonId, entries });
    if (generation !== saveGeneration.current) return;
    setSaveState(res.ok ? "saved" : "error");
    if (pending.current.size > 0) scheduleFlush();
  }

  function scheduleFlush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 600);
  }

  function flushNow() {
    void flush();
  }

  function queueSave(studentId: string) {
    pending.current.add(studentId);
    scheduleFlush();
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    const previous = marksRef.current[studentId] ?? { status: "present", comment: null };
    applyMark(studentId, {
      status,
      comment: attendanceAllowsComment(status) ? previous.comment : null,
    });
    queueSave(studentId);
  }

  function setComment(studentId: string, raw: string) {
    const previous = marksRef.current[studentId] ?? { status: "present", comment: null };
    if (!attendanceAllowsComment(previous.status)) return;
    const comment = raw.slice(0, ATTENDANCE_COMMENT_MAX);
    applyMark(studentId, { comment: comment.length === 0 ? null : comment });
    queueSave(studentId);
  }

  /** Blur must persist the input value before flush — refs update synchronously. */
  function commitComment(studentId: string, raw: string) {
    setComment(studentId, raw);
    flushNow();
  }

  function markAllPresent() {
    const next = defaultMarks(students, {});
    marksRef.current = next;
    setMarks(next);
    for (const student of students) pending.current.add(student.id);
    flushNow();
  }

  function goto(nextDate: string) {
    const params = new URLSearchParams({ tab: "asistencia", date: nextDate });
    router.push(`/aula-virtual/${classId}?${params.toString()}`);
  }

  const today = schoolToday();
  const counts: Record<AttendanceKind, number> = { present: 0, late: 0, absence: 0 };
  for (const mark of Object.values(marks)) counts[ATTENDANCE_KIND[mark.status]] += 1;

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
            const mark = marks[student.id] ?? { status: "present", comment: null };
            const showComment = attendanceAllowsComment(mark.status);
            return (
              <li key={student.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {displayName(student)}
                  </span>
                  <div
                    role="radiogroup"
                    aria-label={displayName(student)}
                    className="flex shrink-0 items-center gap-1"
                  >
                    {ATTENDANCE_STATUS_LIST.map((option) => {
                      const active = mark.status === option;
                      return (
                        <Tooltip key={option} content={a.statuses[option]}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={active}
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
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
                {showComment ? (
                  <label className="mt-2 block">
                    <span className="sr-only">{a.commentLabel}</span>
                    <input
                      type="text"
                      value={mark.comment ?? ""}
                      maxLength={ATTENDANCE_COMMENT_MAX}
                      placeholder={a.commentPlaceholder}
                      onChange={(event) => setComment(student.id, event.target.value)}
                      onBlur={(event) => commitComment(student.id, event.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </label>
                ) : null}
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
