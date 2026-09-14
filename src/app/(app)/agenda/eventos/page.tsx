import { PageHeader } from "@/components/layout/page-header";
import { loadUpcomingEvents } from "@/lib/dashboard/calendar";
import type { TeacherCalendarEvent } from "@/lib/dashboard/calendar";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Upcoming events the school has published (institution calendar). Read-only:
 * teachers consume these; the institution creates and manages them.
 */
export default async function EventosPage() {
  const t = await getT();
  const a = t.agenda.events;
  const events = await loadUpcomingEvents();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.agenda.eventos.label}
        description={t.agenda.eventos.description}
        backHref="/agenda"
      />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2">
          <h2 className="text-xl font-bold text-foreground">{t.agenda.eventos.label}</h2>
          <span className="brand-gradient h-1 w-12 rounded-full" />
        </div>

        {events.length === 0 ? (
          <p className="text-sm font-medium text-foreground/60">{a.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start gap-4 rounded-xl border border-border bg-background px-4 py-3"
              >
                <DateChip date={event.date} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventTypeBadge type={event.eventType} label={a.types[event.eventType]} />
                    <p className="truncate text-sm font-bold text-foreground">{event.title}</p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-foreground/55">
                    {meta(event, a.form.allDay).join(" · ")}
                  </p>
                  {event.description ? (
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground/60">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DateChip({ date }: { date: string }) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, (month ?? 1) - 1, day ?? 1);
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-1.5 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
      <span className="text-[10px] font-bold uppercase tracking-wide">
        {value.toLocaleDateString("es-CR", { month: "short" })}
      </span>
      <span className="text-lg font-bold leading-none tabular-nums">{value.getDate()}</span>
    </div>
  );
}

function EventTypeBadge({ type, label }: { type: TeacherCalendarEvent["eventType"]; label: string }) {
  const tone =
    type === "exam"
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
      : type === "holiday"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
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

function meta(event: TeacherCalendarEvent, allDayLabel: string): string[] {
  const when =
    event.allDay || !event.startTime
      ? allDayLabel
      : `${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`;
  return [when, event.location, event.groupName].filter((value): value is string => !!value);
}
