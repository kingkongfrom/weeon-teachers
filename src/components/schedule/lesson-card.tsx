"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  Clock,
  DoorOpen,
  GraduationCap,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { schoolCycleName } from "@/lib/dashboard/school-cycles";
import { schoolWeekday } from "@/lib/attendance/model";
import {
  TONE_CARD,
  TONE_INK,
  TONE_INK_FAINT,
  type Tone,
} from "@/lib/dashboard/tones";
import type { TeacherLesson } from "@/lib/dashboard/schedule";

function timeLabel(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":");
  if (!hours || !minutes) return hhmm;
  return `${Number(hours)}:${minutes}`;
}

/** Calendar colours collapsed onto the shared Panel General tones (keys mirror
 * the calendar LESSON_COLORS names). */
const LESSON_TONE: Record<string, Tone> = {
  red: "rose",
  rose: "rose",
  orange: "yellow",
  amber: "yellow",
  lime: "green",
  green: "green",
  cyan: "green",
  teal: "green",
  blue: "blue",
  sky: "blue",
  indigo: "blue",
  purple: "purple",
  fuchsia: "purple",
  pink: "purple",
};

/** A lesson tile. Clicking opens a preview of the class — it does not jump
 * straight into grades. */
export function LessonCard({
  lesson,
  dayLabel,
}: {
  lesson: TeacherLesson;
  dayLabel: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const tone = TONE_CARD[LESSON_TONE[lesson.color] ?? "blue"];
  const cycle = lesson.grade ? schoolCycleName(lesson.grade, locale) : "";
  const isToday = schoolWeekday() === lesson.weekday;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${lesson.title} · ${lesson.groupName}`}
        className={cn(
          "flex w-full flex-col gap-1 rounded-xl p-3 text-left ring-1 ring-inset ring-black/5 transition-all hover:brightness-[0.96] active:scale-[0.99] dark:ring-white/10 dark:hover:brightness-110",
          tone,
          TONE_INK,
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{lesson.title}</span>
          <span
            className={cn(
              "shrink-0 text-[11px] font-semibold tabular-nums",
              TONE_INK_FAINT,
            )}
          >
            {timeLabel(lesson.startTime)}
          </span>
        </div>
        <span className={cn("text-[11px] font-medium", TONE_INK_FAINT)}>
          {lesson.groupName}
          {lesson.room ? ` · ${lesson.room}` : ""}
        </span>
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div
                  key="lesson-preview"
                  className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
                >
                  <motion.button
                    type="button"
                    aria-label={t.common.close}
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 cursor-default bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={lesson.title}
                    className="relative z-10 w-full max-w-sm rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  >
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label={t.common.close}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className={cn("rounded-2xl p-4", tone, TONE_INK)}>
                      <p className="text-lg font-bold leading-snug">{lesson.title}</p>
                      <p className="mt-0.5 text-sm font-medium opacity-75">
                        {lesson.groupName}
                        {cycle ? ` · ${cycle}` : ""}
                      </p>
                    </div>

                    <dl className="mt-4 flex flex-col gap-2.5 text-sm">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <CalendarDays className="h-4 w-4 shrink-0 text-foreground/40" />
                        <span className="font-medium">{dayLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Clock className="h-4 w-4 shrink-0 text-foreground/40" />
                        <span className="font-medium tabular-nums">
                          {timeLabel(lesson.startTime)} – {timeLabel(lesson.endTime)}
                        </span>
                      </div>
                      {lesson.room ? (
                        <div className="flex items-center gap-2 text-foreground/70">
                          <DoorOpen className="h-4 w-4 shrink-0 text-foreground/40" />
                          <span className="font-medium">{lesson.room}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Users className="h-4 w-4 shrink-0 text-foreground/40" />
                        <span className="font-medium">
                          {t.grupos.studentsCount(lesson.studentCount)}
                        </span>
                      </div>
                    </dl>

                    <div className="mt-5 flex flex-col gap-2">
                      {isToday ? (
                        <Link
                          href={`/aula-virtual/${lesson.classId}?tab=asistencia&lesson=${lesson.id}`}
                          onClick={() => setOpen(false)}
                          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                        >
                          <CalendarCheck className="h-4 w-4" />
                          {t.attendance.openRegister}
                        </Link>
                      ) : null}
                      <Link
                        href={`/aula-virtual/${lesson.classId}`}
                        onClick={() => setOpen(false)}
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl brand-gradient text-sm font-semibold text-white transition-all hover:brightness-105"
                      >
                        {t.schedule.openClass}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/grupos/${lesson.classId}`}
                        onClick={() => setOpen(false)}
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
                      >
                        <GraduationCap className="h-4 w-4" />
                        {t.classroom.tabs.calificaciones}
                      </Link>
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
