"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { LessonChoice, LessonWeekday } from "@/lib/agenda/lesson-choice";
import { createCalendarEvent, type CalendarEventInput } from "@/lib/teachers/calendar-actions";

const WEEKDAY_INDEX: Record<LessonWeekday, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5 };
/** Teachers publish only these; other event types are school-managed. */
type TeacherEventType = "exam" | "activity";
const TEACHER_EVENT_TYPES: TeacherEventType[] = ["exam", "activity"];
const WEEKDAY_SHORT: Record<LessonWeekday, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mié",
  thu: "Jue",
  fri: "Vie",
};

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

export function lessonLabel(lesson: LessonChoice): string {
  return `${lesson.subject} · ${lesson.groupName} · ${WEEKDAY_SHORT[lesson.weekday]} ${lesson.startTime}–${lesson.endTime}`;
}

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

/**
 * Event/exam dialog. The class period fixes subject + group + weekday; the date
 * (from the opened week/day when provided) and times are prefilled. The inner
 * form remounts on each open so it always starts from the requested lesson.
 */
export function EventFormDialog({
  open,
  lessons,
  initialLessonId,
  initialDate,
  onClose,
  onSaved,
}: {
  open: boolean;
  lessons: LessonChoice[];
  initialLessonId?: string;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} title={t.agenda.events.dialogTitle} onClose={onClose}>
      {open ? (
        <EventForm
          key={`${initialLessonId ?? ""}:${initialDate ?? ""}`}
          lessons={lessons}
          initialLessonId={initialLessonId}
          initialDate={initialDate}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function EventForm({
  lessons,
  initialLessonId,
  initialDate,
  onClose,
  onSaved,
}: {
  lessons: LessonChoice[];
  initialLessonId?: string;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const a = t.agenda.events;

  const initialLesson = lessons.find((item) => item.id === initialLessonId) ?? lessons[0] ?? null;
  const [lessonId, setLessonId] = useState(initialLesson?.id ?? "");
  const [eventType, setEventType] = useState<TeacherEventType>("exam");
  const [title, setTitle] = useState(initialLesson ? `${a.types.exam} de ${initialLesson.subject}` : "");
  const [date, setDate] = useState<string | null>(
    initialLesson
      ? initialDate && weekdayOfISO(initialDate) === WEEKDAY_INDEX[initialLesson.weekday]
        ? initialDate
        : nextOccurrenceISO(initialLesson.weekday)
      : null,
  );
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState(initialLesson?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(initialLesson?.endTime ?? "09:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lesson = lessons.find((item) => item.id === lessonId) ?? null;
  const typeOptions = TEACHER_EVENT_TYPES.map((value) => ({
    value,
    label: a.types[value],
  }));
  const lessonOptions = lessons.map((item) => ({ value: item.id, label: lessonLabel(item) }));
  const dateMatchesLesson =
    lesson != null && date != null && weekdayOfISO(date) === WEEKDAY_INDEX[lesson.weekday];
  const canSubmit =
    title.trim().length > 0 &&
    lesson != null &&
    date != null &&
    dateMatchesLesson &&
    (allDay || startTime < endTime);

  function chooseLesson(next: LessonChoice) {
    setLessonId(next.id);
    setTitle(`${a.types[eventType]} de ${next.subject}`);
    setDate(
      initialDate && weekdayOfISO(initialDate) === WEEKDAY_INDEX[next.weekday]
        ? initialDate
        : nextOccurrenceISO(next.weekday),
    );
    setStartTime(next.startTime);
    setEndTime(next.endTime);
  }

  async function submit() {
    if (!canSubmit || pending || !lesson || !date) return;
    setPending(true);
    setError(null);
    const payload: CalendarEventInput = {
      lessonId: lesson.id,
      eventType,
      title,
      date,
      allDay,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
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
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{a.form.lesson}</span>
        <Dropdown
          value={lessonId}
          onChange={(value) => {
            const next = lessons.find((item) => item.id === value);
            if (next) chooseLesson(next);
          }}
          options={lessonOptions}
          ariaLabel={a.form.lesson}
          placeholder={a.form.lessonPlaceholder}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">{a.form.type}</span>
          <Dropdown
            value={eventType}
            onChange={(value) => setEventType(value as TeacherEventType)}
            options={typeOptions}
            ariaLabel={a.form.type}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">{a.form.date}</span>
          <DatePicker value={date} onChange={setDate} placeholder={a.form.date} />
        </div>
      </div>
      <p className={cn("text-xs font-medium", dateMatchesLesson ? "text-foreground/45" : "text-error")}>
        {a.form.dateHint}
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground/70">{a.form.allDay}</span>
        <Switch checked={allDay} onChange={setAllDay} label={a.form.allDay} />
      </div>

      {!allDay ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/60">{a.form.start}</span>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/60">{a.form.end}</span>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      ) : null}

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
