"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { hubToneSegment, SEGMENT_TRACK, TONE_ICON, TONE_WELL, eventHubChip } from "@/lib/dashboard/tones";
import { addMonths, capitalize, firstOfMonth, monthCells, weekdayIndex } from "@/lib/dashboard/month";
import { isoDate } from "@/lib/dashboard/week";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExamDateDialog } from "@/components/assessments/exam-date-dialog";
import { deleteExamDate } from "@/lib/teachers/exam-date-actions";
import type { Weekday } from "@/lib/dashboard/schedule";
import type { ClassLessonDay, ExamDate } from "@/lib/dashboard/exam-dates";
import type { ClassMaterial } from "@/lib/dashboard/materials";

const WEEKDAY_BY_INDEX: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

/**
 * Dedicated "Fechas de examen" tab: a Mon–Fri month, class days marked, and the
 * selected day beside the grid.
 */
export function ExamDatesPanel({
  classId,
  examDates,
  lessonDays,
  materials,
  subjects,
  selectedSubjectId,
}: {
  classId: string;
  examDates: ExamDate[];
  lessonDays: ClassLessonDay[];
  materials: ClassMaterial[];
  subjects: { id: string; name: string }[];
  selectedSubjectId: string | null;
}) {
  const t = useT();
  const e = t.examDates;
  const locale = useLocale() === "en" ? "en-US" : "es-CR";
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamDate | null>(null);
  const [seed, setSeed] = useState<{ date: string; lessonId: string | null } | null>(null);
  const [deleting, setDeleting] = useState<ExamDate | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(
    () =>
      examDates
        .filter((examDate) => !selectedSubjectId || examDate.subjectId === selectedSubjectId)
        .slice()
        .sort(
          (a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""),
        ),
    [examDates, selectedSubjectId],
  );

  const today = new Date();
  const todayKey = isoDate(today);
  const opening = shown.find((examDate) => examDate.date >= todayKey) ?? shown[0] ?? null;

  const [cursor, setCursor] = useState(() => firstOfMonth(opening ? parseDay(opening.date) : today));
  const [selectedKey, setSelectedKey] = useState(opening?.date ?? todayKey);

  const classWeekdays = useMemo(
    () => new Set(lessonDays.map((lesson) => lesson.weekday)),
    [lessonDays],
  );
  const byDate = useMemo(() => {
    const map = new Map<string, ExamDate[]>();
    for (const examDate of shown) {
      const list = map.get(examDate.date) ?? [];
      list.push(examDate);
      map.set(examDate.date, list);
    }
    return map;
  }, [shown]);

  const subjectName = (id: string | null) =>
    subjects.find((subject) => subject.id === id)?.name ?? "";

  const monthLabel = capitalize(
    cursor.toLocaleDateString(locale, { month: "long", year: "numeric" }),
  );
  const weekdayLabels = Array.from({ length: 5 }, (_, index) => {
    const sample = new Date(2026, 0, 5 + index);
    return capitalize(sample.toLocaleDateString(locale, { weekday: "short" }).replace(".", ""));
  });
  const cells = monthCells(cursor);
  const selectedDate = parseDay(selectedKey);
  const selectedExams = byDate.get(selectedKey) ?? [];
  const selectedLabel = {
    weekday: capitalize(selectedDate.toLocaleDateString(locale, { weekday: "long" })),
    day: selectedDate.toLocaleDateString(locale, { day: "numeric" }),
    month: capitalize(selectedDate.toLocaleDateString(locale, { month: "long" })),
  };

  function showMonth(next: Date) {
    const start = firstOfMonth(next);
    setCursor(start);
    const inMonth = shown.filter((examDate) => {
      const date = parseDay(examDate.date);
      return date.getFullYear() === start.getFullYear() && date.getMonth() === start.getMonth();
    });
    setSelectedKey(inMonth[0]?.date ?? isoDate(start));
  }

  function openCreate(next?: { date: string; lessonId: string | null }) {
    setEditing(null);
    setSeed(next ?? null);
    setDialogOpen(true);
  }

  function openCreateOnDay(key: string) {
    const date = parseDay(key);
    const weekday = WEEKDAY_BY_INDEX[weekdayIndex(date)];
    if (!weekday || date.getMonth() !== cursor.getMonth() || !classWeekdays.has(weekday)) return;
    const lessonId = lessonDays.find((lesson) => lesson.weekday === weekday)?.lessonId ?? null;
    setSelectedKey(key);
    openCreate({ date: key, lessonId });
  }

  function openEdit(examDate: ExamDate) {
    setEditing(examDate);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setPendingDelete(true);
    setError(null);
    const res = await deleteExamDate({ classId, examDateId: deleting.id });
    setPendingDelete(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-5">
      {subjects.length > 1 ? (
        <div className={SEGMENT_TRACK}>
          {subjects.map((option) => (
            <Link
              key={option.id}
              href={`/aula-virtual/${classId}?subject=${option.id}&tab=examenes`}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                hubToneSegment("blue", option.id === selectedSubjectId),
              )}
            >
              {option.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm font-medium text-foreground/55">{e.lead}</p>
        <button
          type="button"
          onClick={() => openCreate()}
          disabled={lessonDays.length === 0}
          title={lessonDays.length === 0 ? e.noLessons : undefined}
          className="btn-ink gap-1.5 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {e.add}
        </button>
      </div>

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.7fr)]">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
            <button
              type="button"
              onClick={() => showMonth(addMonths(cursor, -1))}
              aria-label={e.prevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">{monthLabel}</h3>
            <button
              type="button"
              onClick={() => showMonth(addMonths(cursor, 1))}
              aria-label={e.nextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-5 bg-brand-50/70 dark:bg-brand-950/30">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-brand-700/75 dark:text-brand-300/85"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5">
            {cells.map((day) => {
              const key = isoDate(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const weekday = WEEKDAY_BY_INDEX[weekdayIndex(day)];
              const meets = inMonth && weekday != null && classWeekdays.has(weekday);
              const dayExams = byDate.get(key) ?? [];
              const chips = dayExams.slice(0, 2);
              const overflow = dayExams.length - chips.length;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  onDoubleClick={() => openCreateOnDay(key)}
                  className={cn(
                    "flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors [&:nth-child(5n)]:border-r-0 sm:min-h-28 sm:p-2",
                    meets
                      ? "bg-surface hover:bg-brand-50/50 dark:hover:bg-brand-950/20"
                      : "bg-surface",
                    isSelected && meets && "bg-[#fff5f7] ring-2 ring-inset ring-[#e11d48]/35 dark:bg-[#3a1622]/40",
                    isSelected && !meets && "ring-2 ring-inset ring-foreground/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs",
                      isToday && meets
                        ? "brand-gradient font-bold text-white"
                        : meets
                          ? "font-bold text-foreground"
                          : inMonth
                            ? "font-medium text-foreground/30"
                            : "font-medium text-foreground/20",
                      isToday && !meets && "ring-1 ring-inset ring-foreground/20",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="flex min-h-0 flex-1 flex-col gap-0.5">
                    {chips.map((examDate) => (
                      <span
                        key={examDate.id}
                        className={cn(
                          "truncate rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-4",
                          eventHubChip("exam"),
                          examDate.date < todayKey && "opacity-60",
                        )}
                      >
                        {examDate.startTime ? `${examDate.startTime.slice(0, 5)} ` : ""}
                        {examDate.title || subjectName(examDate.subjectId) || e.untitled}
                      </span>
                    ))}
                    {overflow > 0 ? (
                      <span className="px-1 text-[10px] font-semibold text-foreground/45">+{overflow}</span>
                    ) : null}
                    {chips.length === 0 && meets ? (
                      <span className="mt-auto h-1.5 w-1.5 rounded-full bg-foreground/25" aria-hidden />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] font-semibold text-foreground/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
              {e.legendClass}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-6 rounded-sm", TONE_WELL.rose)} />
              {e.legendExam}
            </span>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-4">
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-wider", TONE_ICON.rose)}>
              {selectedLabel.weekday}
            </p>
            <p className="mt-1 text-5xl font-bold leading-none tracking-tight text-foreground">
              {selectedLabel.day}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground/50">{selectedLabel.month}</p>
          </div>

          {selectedExams.length === 0 ? (
            <p className="text-sm font-medium text-foreground/50">
              {shown.length === 0 ? e.empty : e.dayEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedExams.map((examDate) => (
                <li
                  key={examDate.id}
                  className={cn(
                    "rounded-2xl border border-border px-3.5 py-3",
                    examDate.date < todayKey && "opacity-70",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {examDate.title || subjectName(examDate.subjectId) || e.untitled}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium text-foreground/55">
                        {subjectName(examDate.subjectId) ? (
                          <span>{subjectName(examDate.subjectId)}</span>
                        ) : null}
                        {examDate.startTime ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {examDate.startTime.slice(0, 5)}
                            {examDate.endTime ? `–${examDate.endTime.slice(0, 5)}` : ""}
                          </span>
                        ) : null}
                        {examDate.room ? (
                          <span className="inline-flex items-center gap-1">
                            <DoorOpen className="h-3 w-3" />
                            {examDate.room}
                          </span>
                        ) : null}
                        {examDate.materialIds.length > 0 ? (
                          <span>{e.materialCount(examDate.materialIds.length)}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => openEdit(examDate)}
                        aria-label={e.edit}
                        title={e.edit}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(examDate)}
                        aria-label={e.delete}
                        title={e.delete}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-error/70 transition-colors hover:bg-error/10 hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {dialogOpen ? (
        <ExamDateDialog
          open={dialogOpen}
          classId={classId}
          subjectId={selectedSubjectId}
          lessonDays={lessonDays}
          materials={materials}
          editing={editing}
          initialDate={editing ? null : seed?.date ?? null}
          initialLessonId={editing ? null : seed?.lessonId ?? null}
          onClose={() => setDialogOpen(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title={e.deleteConfirm}
        description={
          deleting ? `${deleting.title || subjectName(deleting.subjectId)} · ${deleting.date}` : undefined
        }
        confirmLabel={e.delete}
        cancelLabel={t.common.cancel}
        pending={pendingDelete}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!pendingDelete) setDeleting(null);
        }}
      />
    </section>
  );
}

function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}
