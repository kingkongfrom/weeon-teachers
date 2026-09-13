"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { LessonChoice, LessonWeekday } from "@/lib/agenda/lesson-choice";
import { createCalendarEvent, type CalendarEventInput } from "@/lib/teachers/calendar-actions";

const WEEKDAY_INDEX: Record<LessonWeekday, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5 };
const WEEKDAY_SHORT: Record<LessonWeekday, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mié",
  thu: "Jue",
  fri: "Vie",
};
/** Teachers publish only these; other event types are school-managed. */
type TeacherEventType = "exam" | "activity";
const TEACHER_EVENT_TYPES: TeacherEventType[] = ["exam", "activity"];

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Next date (today included) that falls on the lesson's weekday. */
function nextOccurrenceISO(weekday: LessonWeekday): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + ((WEEKDAY_INDEX[weekday] - date.getDay() + 7) % 7));
  return iso(date);
}

function weekdayOfISO(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function lessonLabel(lesson: LessonChoice): string {
  return `${lesson.subject} · ${lesson.groupName} · ${WEEKDAY_SHORT[lesson.weekday]} ${lesson.startTime}–${lesson.endTime}`;
}

function formattedDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

/**
 * Exam/activity dialog, opened from a class tile. The class (subject, group,
 * weekday, time) and the date of the opened day are already fixed by the
 * schedule, so the teacher only picks the type and adds a title/notes.
 */
export function EventFormDialog({
  open,
  lesson,
  initialDate,
  onClose,
  onSaved,
}: {
  open: boolean;
  lesson: LessonChoice;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} title={t.agenda.events.dialogTitle} onClose={onClose}>
      {open ? (
        <EventForm
          key={`${lesson.id}:${initialDate ?? ""}`}
          lesson={lesson}
          initialDate={initialDate}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function EventForm({
  lesson,
  initialDate,
  onClose,
  onSaved,
}: {
  lesson: LessonChoice;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const a = t.agenda.events;

  const date =
    initialDate && weekdayOfISO(initialDate) === WEEKDAY_INDEX[lesson.weekday]
      ? initialDate
      : nextOccurrenceISO(lesson.weekday);

  const [eventType, setEventType] = useState<TeacherEventType>("exam");
  const [title, setTitle] = useState(`${a.types.exam} de ${lesson.subject}`);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeOptions = TEACHER_EVENT_TYPES.map((value) => ({ value, label: a.types[value] }));
  const canSubmit = title.trim().length > 0;

  async function submit() {
    if (!canSubmit || pending) return;
    setPending(true);
    setError(null);
    const payload: CalendarEventInput = {
      lessonId: lesson.id,
      eventType,
      title,
      date,
      allDay: false,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      location: location.trim() || null,
      description: description.trim() || null,
    };
    const result = await createCalendarEvent(payload);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2.5">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{lessonLabel(lesson)}</p>
          <p className="text-xs font-medium text-foreground/55">
            {formattedDate(date)} · {lesson.startTime}–{lesson.endTime}
          </p>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{a.form.type}</span>
        <Dropdown
          value={eventType}
          onChange={(value) => setEventType(value as TeacherEventType)}
          options={typeOptions}
          ariaLabel={a.form.type}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{a.form.title}</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={a.form.titlePlaceholder}
          maxLength={160}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{a.form.location}</span>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={160}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{a.form.description}</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={2000}
          className={cn(inputClass, "h-auto resize-y py-2")}
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
        >
          {t.common.cancel}
        </button>
        <Button onClick={() => void submit()} disabled={!canSubmit || pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? a.form.saving : a.form.submit}
        </Button>
      </div>
    </div>
  );
}
