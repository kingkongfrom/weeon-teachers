import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { getT } from "@/lib/i18n/server";

export default async function HorariosPage() {
  const lessons = await loadTeacherSchedule();
  const t = await getT();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.horarios.title}
        description={t.horarios.description}
        backHref="/inicio"
      />

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
            <CalendarDays className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium text-foreground/60">
            {t.panel.noLessons}
          </p>
        </div>
      ) : (
        <ScheduleGrid lessons={lessons} />
      )}
    </div>
  );
}
