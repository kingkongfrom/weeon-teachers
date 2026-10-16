"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProfileAvatarDisplay } from "@/components/layout/profile-avatar-display";
import type { TeacherStudent } from "@/lib/dashboard/grupos";
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

export type AttendanceStudent = Pick<
  TeacherStudent,
  "id" | "firstName" | "lastName" | "secondLastName" | "avatarUrl"
>;

type SaveState = "idle" | "saving" | "saved" | "error";

const CHIP: Record<AttendanceStatus, string> = {
  present:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AttendanceKind | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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

  function scheduleFlush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 600);
  }

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

  useEffect(() => {
    if (!openId) return;
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpenId(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current.size > 0) void flush();
    };
  }, []);

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

  function requestMarkAll() {
    const hasException = students.some(
      (student) => (marksRef.current[student.id]?.status ?? "present") !== "present",
    );
    if (!hasException) return;
    setConfirmAll(true);
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

  const hasException = counts.late + counts.absence > 0;
  const visible = students.filter((student) => {
    if (!filter) return true;
    const status = marks[student.id]?.status ?? "present";
    return ATTENDANCE_KIND[status] === filter;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
        </div>

        {students.length > 0 ? (
          <button
            type="button"
            onClick={requestMarkAll}
            disabled={!hasException}
            className="text-xs font-semibold text-foreground/55 underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
          >
            {a.markAllPresent}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {summaryKinds.map(({ kind, dot }) => {
          const selected = filter === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setOpenId(null);
                setFilter(selected ? null : kind);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                selected
                  ? "border-foreground/25 bg-surface text-foreground"
                  : "border-border text-foreground/70 hover:bg-surface-muted",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", dot)} />
              {a.summary[kind]} · {counts[kind]}
            </button>
          );
        })}
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground/50">{a.empty}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm font-medium text-foreground/50">{a.filterEmpty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {visible.map((student) => {
            const mark = marks[student.id] ?? { status: "present" as const, comment: null };
            const showComment = attendanceAllowsComment(mark.status);
            const menuOpen = openId === student.id;
            return (
              <li
                key={student.id}
                className="rounded-2xl border border-border bg-surface px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <ProfileAvatarDisplay
                    name={displayName(student)}
                    imageUrl={student.avatarUrl}
                    size="sm"
                    className="rounded-full"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {displayName(student)}
                  </span>
                  <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={menuOpen}
                      aria-label={a.statuses[mark.status]}
                      onClick={() => setOpenId(menuOpen ? null : student.id)}
                      className={cn(
                        "inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-bold",
                        CHIP[mark.status],
                      )}
                    >
                      {mark.status === "present" ? a.statuses.present : ATTENDANCE_CODE[mark.status]}
                    </button>
                    {menuOpen ? (
                      <ul
                        role="listbox"
                        aria-label={displayName(student)}
                        className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-border bg-surface p-1 shadow-lg"
                      >
                        {ATTENDANCE_STATUS_LIST.map((option) => {
                          const active = mark.status === option;
                          return (
                            <li key={option}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setStatus(student.id, option);
                                  setOpenId(null);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                                  active
                                    ? "bg-surface-muted font-semibold text-foreground"
                                    : "font-medium text-foreground/80 hover:bg-surface-muted",
                                )}
                              >
                                <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[option])} />
                                <span className="w-7 shrink-0 font-bold">{ATTENDANCE_CODE[option]}</span>
                                {a.statuses[option]}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
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
                {mark.guardianDecision === "pending" ? (
                  <p className="mt-2 text-xs font-medium text-amber-900/90 dark:text-amber-200/90">
                    {a.registerJustificationPending}{" "}
                    <Link
                      href="/aula-virtual/justificaciones"
                      className="font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      {a.registerReviewJustifications}
                    </Link>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmAll}
        title={a.markAllPresentConfirm}
        description={a.markAllPresentBody}
        confirmLabel={a.markAllPresent}
        cancelLabel={t.common.cancel}
        onConfirm={() => {
          setConfirmAll(false);
          markAllPresent();
        }}
        onCancel={() => setConfirmAll(false)}
      />
    </div>
  );
}
