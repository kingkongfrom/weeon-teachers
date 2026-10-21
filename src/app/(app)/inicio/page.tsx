import { PanelAttentionStrip } from "@/components/dashboard/panel-attention";
import { TeacherMorning } from "@/components/dashboard/teacher-morning";
import { FadeIn } from "@/components/motion/fade-in";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { schoolToday } from "@/lib/attendance/model";
import { loadEventsBetween, loadGroupEventsBetween } from "@/lib/dashboard/calendar";
import { loadPanelAttention } from "@/lib/dashboard/panel-attention";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { getLocale, getT } from "@/lib/i18n/server";
import { loadSchoolWeather } from "@/lib/weather/load-school-weather";

export const dynamic = "force-dynamic";

/** Landing — Resumen-style morning sheet: date, shortcuts, access cards, week. */
export default async function InicioPage() {
  const session = await getTeacherSession();
  const t = await getT();
  const locale = await getLocale();

  const todayISO = schoolToday();
  const [schedule, attention, todayEvents, weekEvents, weather] = await Promise.all([
    loadTeacherSchedule(),
    loadPanelAttention(),
    loadGroupEventsBetween(todayISO, todayISO),
    loadEventsBetween(weekStartISO(todayISO), weekEndISO(todayISO)),
    loadSchoolWeather(session?.tenantId ?? null),
  ]);

  return (
    <FadeIn className="flex flex-col gap-6">
      <TeacherMorning
        locale={locale}
        todayISO={todayISO}
        weekLabels={t.schedule.weekdays}
        lessons={schedule}
        weekEvents={weekEvents}
        todayEvents={todayEvents}
        weather={weather}
        unreadInboxCount={attention.unreadInboxCount}
        unreadChatCount={attention.unreadChatCount}
        copy={{
          ...t.panel.sheet,
          todayTitle: t.panel.todayTitle,
          todayEmpty: t.panel.todayEmpty,
          weekendEmpty: t.panel.weekendEmpty,
          viewFullSchedule: t.panel.viewFullSchedule,
        }}
        attention={<PanelAttentionStrip attention={attention} />}
      />
    </FadeIn>
  );
}

function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function isoOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekStartISO(todayISO: string): string {
  const monday = parseISO(todayISO);
  const weekday = monday.getDay();
  monday.setDate(monday.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return isoOf(monday);
}

function weekEndISO(todayISO: string): string {
  const start = parseISO(weekStartISO(todayISO));
  start.setDate(start.getDate() + 4);
  return isoOf(start);
}
