"use client";

import { useState } from "react";
import { Clock, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { LessonDatePicker } from "@/components/assessments/lesson-date-picker";
import { StudyMaterialPicker } from "@/components/assessments/study-material-picker";
import { saveExamDate } from "@/lib/teachers/exam-date-actions";
import type { ClassLessonDay, ExamDate } from "@/lib/dashboard/exam-dates";
import type { ClassMaterial } from "@/lib/dashboard/materials";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

const FIELD_LABEL = "text-xs font-bold uppercase tracking-wide text-foreground/45";

/**
 * Define / edit an exam date for the class's active subject. The date must fall
 * on a weekday the class has a period for that subject; the period's slot is
 * then shown. Material is picked from documents already shared with the class.
 */
export function ExamDateDialog({
  open,
  classId,
  subjectId,
  lessonDays,
  materials,
  editing,
  initialDate = null,
  initialLessonId = null,
  onClose,
  onSaved,
}: {
  open: boolean;
  classId: string;
  /** The class's active subject (fixed — the subject is already chosen). */
  subjectId: string | null;
  lessonDays: ClassLessonDay[];
  materials: ClassMaterial[];
  editing?: ExamDate | null;
  /** Prefilled when the teacher double-clicks a class day. */
  initialDate?: string | null;
  initialLessonId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const examDates = t.examDates;
  // Subject lives in the header ("Examen · Ciencias"), not as a body field —
  // it is already chosen by the active tab.
  const subjectName =
    lessonDays.find((lesson) => lesson.subjectName)?.subjectName ?? examDates.thisSubject;
  const headerTitle = `${examDates.headerPrefix} · ${subjectName}`;
  return (
    <Dialog open={open} title={headerTitle} onClose={onClose} panelClassName="max-w-lg">
      {open ? (
        <ExamDateForm
          key={editing?.id ?? initialDate ?? "new"}
          classId={classId}
          subjectId={editing?.subjectId ?? subjectId}
          lessonDays={lessonDays}
          materials={materials}
          editing={editing ?? null}
          initialDate={initialDate}
          initialLessonId={initialLessonId}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function ExamDateForm({
  classId,
  subjectId,
  lessonDays,
  materials,
  editing,
  initialDate = null,
  initialLessonId = null,
  onClose,
  onSaved,
}: {
  classId: string;
  subjectId: string | null;
  lessonDays: ClassLessonDay[];
  materials: ClassMaterial[];
  editing: ExamDate | null;
  initialDate?: string | null;
  initialLessonId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const e = t.examDates;

  const [date, setDate] = useState<string | null>(editing?.date ?? initialDate);
  const [lessonId, setLessonId] = useState<string | null>(editing?.lessonId ?? initialLessonId);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [materialIds, setMaterialIds] = useState<string[]>(editing?.materialIds ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Periods and material for the active subject only — a Ciencias exam cannot
  // land on a Matemática period.
  const subjectLessons = lessonDays.filter((lesson) => !subjectId || lesson.subjectId === subjectId);
  const subjectMaterials = materials.filter(
    (material) => !subjectId || material.subjectId === subjectId,
  );

  const selectedLesson = subjectLessons.find((lesson) => lesson.lessonId === lessonId) ?? null;
  const slotsForChosenDay = date
    ? subjectLessons.filter((lesson) => lesson.weekday === weekdayOfISO(date))
    : [];

  const canSubmit = Boolean(date && lessonId && subjectId);

  async function submit() {
    if (!canSubmit || pending) return;
    setPending(true);
    setError(null);
    const res = await saveExamDate({
      id: editing?.id,
      classId,
      subjectId,
      lessonId: lessonId as string,
      title: title.trim(),
      date: date as string,
      materialIds,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>{e.dateLabel}</span>
        {subjectLessons.length > 0 ? (
          <>
            <LessonDatePicker
              value={date}
              lessons={subjectLessons}
              onPickLesson={(pickedLessonId) => setLessonId(pickedLessonId)}
              selectedLessonId={lessonId}
              onChange={(pickedDate) => {
                setDate(pickedDate);
                if (!pickedDate) setLessonId(null);
              }}
              clearLabel={e.clearDate}
            />

            {date && slotsForChosenDay.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className={FIELD_LABEL}>{e.slotLabel}</span>
                {slotsForChosenDay.map((slot) => (
                  <button
                    key={slot.lessonId}
                    type="button"
                    onClick={() => setLessonId(slot.lessonId)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                      slot.lessonId === lessonId
                        ? "bg-foreground text-background"
                        : "border border-border text-foreground/60 hover:bg-surface-muted",
                    )}
                  >
                    {clock(slot.startTime)}–{clock(slot.endTime)}
                    {slot.room ? ` · ${slot.room}` : ""}
                  </button>
                ))}
              </div>
            ) : null}

            {selectedLesson ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-brand-200 bg-brand-50/50 px-3.5 py-2.5 text-sm font-semibold text-foreground dark:border-brand-900 dark:bg-brand-950/30">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand-600" />
                  {clock(selectedLesson.startTime)}–{clock(selectedLesson.endTime)}
                </span>
                {selectedLesson.room ? (
                  <span className="flex items-center gap-1.5 text-foreground/70">
                    <DoorOpen className="h-3.5 w-3.5 text-foreground/40" />
                    {selectedLesson.room}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-xs font-medium text-foreground/50">
            {e.noLessonsForSubject}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>{e.titleLabel}</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={e.titlePlaceholder}
          maxLength={160}
          className={inputClass}
        />
      </label>

      <StudyMaterialPicker
        classId={classId}
        subjectId={subjectId}
        materials={subjectMaterials}
        selectedIds={materialIds}
        onChange={setMaterialIds}
      />

      {error ? (
        <p className="rounded-xl bg-error/10 px-3.5 py-2.5 text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
        >
          {t.common.cancel}
        </button>
        <Button onClick={() => void submit()} disabled={!canSubmit || pending} className="h-11">
          {pending ? e.saving : e.submit}
        </Button>
      </div>
    </div>
  );
}

function clock(value: string): string {
  return value.slice(0, 5);
}

function weekdayOfISO(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
    new Date(year, month - 1, day).getDay()
  ];
}
