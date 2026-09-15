"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { Dropdown } from "@/components/ui/dropdown";
import { TONE_PILL } from "@/lib/dashboard/tones";
import {
  ATTENDANCE_CODE,
  summarizeTardias,
  type TardiaRecord,
} from "@/lib/attendance/model";
import type { TeacherStudent } from "@/lib/dashboard/grupos";

function studentName(student: TeacherStudent): string {
  return `${student.lastName} ${student.firstName}`.trim();
}

function formatDate(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Read-only asistencia (tardías) log — marks are taken in Aula virtual → Asistencia. */
export function AttendanceGroupWorkspace({
  classId,
  groupName,
  students,
  initialRecords,
  locale,
}: {
  classId: string;
  groupName: string;
  students: TeacherStudent[];
  initialRecords: TardiaRecord[];
  locale: string;
}) {
  const t = useT();
  const a = t.attendance;
  const gv = a.groupView;
  const [query, setQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<string | "all">("all");

  const summaries = useMemo(() => summarizeTardias(initialRecords), [initialRecords]);

  const visibleStudents = students.filter((student) =>
    studentName(student).toLowerCase().includes(query.trim().toLowerCase()),
  );

  const filteredRecords = initialRecords.filter((row) => {
    if (studentFilter !== "all" && row.studentId !== studentFilter) return false;
    if (query.trim()) {
      const student = students.find((s) => s.id === row.studentId);
      if (!student) return false;
      return studentName(student).toLowerCase().includes(query.trim().toLowerCase());
    }
    return true;
  });

  const aulaHref = `/aula-virtual/${classId}?tab=asistencia`;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="brand-page-title text-3xl font-bold text-foreground sm:text-4xl">
            {groupName}
          </h1>
          <p className="mt-0.5 text-sm font-medium text-foreground/55">{gv.subtitle}</p>
        </div>
        <Link
          href={aulaHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
        >
          {a.openRegister}
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </header>

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground/60">
        {gv.registerHint}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative inline-flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={gv.search}
            className="h-9 w-60 rounded-full border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand-400"
          />
        </label>
        <div className="min-w-[12rem]">
          <Dropdown
            value={studentFilter}
            onChange={setStudentFilter}
            ariaLabel={gv.allStudents}
            placeholder={gv.allStudents}
            options={[
              { value: "all", label: gv.allStudents },
              ...students.map((student) => ({
                value: student.id,
                label: studentName(student),
              })),
            ]}
          />
        </div>
      </div>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm font-medium text-foreground/50">
          {gv.noStudents}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/45">
              {gv.summaryTitle}
            </h2>
            <div className="overflow-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-foreground/50">
                    <th className="px-4 py-3">{gv.student}</th>
                    <th className="px-4 py-3 text-center">{ATTENDANCE_CODE.late_justified}</th>
                    <th className="px-4 py-3 text-center">{ATTENDANCE_CODE.late_unjustified}</th>
                    <th className="px-4 py-3 text-center">{gv.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => {
                    const summary = summaries.get(student.id) ?? {
                      studentId: student.id,
                      justified: 0,
                      unjustified: 0,
                      total: 0,
                    };
                    return (
                      <tr key={student.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/estudiantes/${student.id}?from=${encodeURIComponent(`/grupos/${classId}?tab=asistencia`)}`}
                            className="font-medium text-foreground transition-colors hover:text-[#7c3aed] dark:hover:text-[#b9a3f7]"
                          >
                            {studentName(student)}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums">
                          <span className={cn("rounded-md px-2 py-0.5 font-semibold", TONE_PILL.yellow)}>
                            {summary.justified}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums">
                          <span className={cn("rounded-md px-2 py-0.5 font-semibold", TONE_PILL.rose)}>
                            {summary.unjustified}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-base font-bold tabular-nums text-foreground/80">
                          {summary.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/45">
              {gv.logTitle}
            </h2>
            {filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                <Clock className="h-8 w-8 text-foreground/25" strokeWidth={1.75} />
                <p className="text-sm font-medium text-foreground/55">{gv.emptyLog}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {filteredRecords.map((row) => {
                  const student = students.find((s) => s.id === row.studentId);
                  const statusLabel = a.statuses[row.status];
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                              row.status === "late_justified" ? TONE_PILL.yellow : TONE_PILL.rose,
                            )}
                          >
                            {ATTENDANCE_CODE[row.status]}
                          </span>
                          <span className="text-xs font-semibold text-foreground/45">
                            {formatDate(row.date, locale)}
                          </span>
                          <span className="text-xs font-medium text-foreground/55">
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-foreground">
                          {student ? studentName(student) : gv.unknownStudent}
                        </p>
                        {row.comment ? (
                          <p className="mt-1 text-sm text-foreground/65">{row.comment}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
