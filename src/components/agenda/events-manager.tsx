"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EventFormDialog } from "@/components/agenda/event-form-dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { LessonChoice } from "@/lib/agenda/lesson-choice";
import { deleteCalendarEvent } from "@/lib/teachers/calendar-actions";
import type { CalendarEventType, TeacherCalendarEvent } from "@/lib/dashboard/calendar";

/**
 * Events & exams page: the list is the page and the form opens on demand in a
 * dialog. Every event is tied to a scheduled class period.
 */
export function EventsManager({
  events,
  lessons,
}: {
  events: TeacherCalendarEvent[];
  lessons: LessonChoice[];
}) {
  const t = useT();
  const a = t.agenda.events;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TeacherCalendarEvent | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    await deleteCalendarEvent(target.id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
          {a.list.title}
        </h2>
        <Button onClick={() => setOpen(true)} disabled={lessons.length === 0}>
          <CalendarPlus className="h-4 w-4" />
          {a.addButton}
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
          <p className="text-sm font-medium text-foreground/55">{a.list.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <EventTypeBadge type={event.eventType} label={a.types[event.eventType]} />
                  <p className="truncate text-sm font-bold text-foreground">{event.title}</p>
                </div>
                <p className="mt-1 text-xs font-medium text-foreground/55">
                  {[formatEventDate(event), event.subjectName, event.groupName]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToDelete(event)}
                aria-label={a.list.delete}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <EventFormDialog
        open={open}
        lessons={lessons}
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={toDelete != null}
        title={a.list.delete}
        description={a.list.deleteConfirm}
        confirmLabel={a.list.delete}
        cancelLabel={t.common.cancel}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function EventTypeBadge({ type, label }: { type: CalendarEventType; label: string }) {
  const tone =
    type === "exam"
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
      : type === "activity"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function formatEventDate(event: TeacherCalendarEvent): string {
  const [year, month, day] = event.date.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  const label = date.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
  if (event.allDay || !event.startTime) return label;
  return `${label} · ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`;
}
