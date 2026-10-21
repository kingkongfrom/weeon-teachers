import {
  CalendarDays,
  GraduationCap,
  Mail,
  MessageCircle,
  Presentation,
} from "lucide-react";
import {
  HubQuincunxGrid,
  type HubQuincunxItem,
} from "@/components/dashboard/hub-quincunx-grid";
import { PanelAttentionStrip } from "@/components/dashboard/panel-attention";
import { TodayWeatherBlock } from "@/components/dashboard/today-weather-block";
import { FadeIn } from "@/components/motion/fade-in";
import { ScheduleUpcoming } from "@/components/schedule/schedule-upcoming";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { schoolToday } from "@/lib/attendance/model";
import { loadGroupEventsBetween } from "@/lib/dashboard/calendar";
import { loadPanelAttention } from "@/lib/dashboard/panel-attention";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { loadSchoolWeather } from "@/lib/weather/load-school-weather";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Landing / hub — five-tile grid plus today's schedule. */
export default async function InicioPage() {
  const session = await getTeacherSession();
  const t = await getT();
  const locale = await getLocale();

  const todayISO = schoolToday();
  const [schedule, schoolName, attention, todayEvents, weather] = await Promise.all([
    loadTeacherSchedule(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
    loadPanelAttention(),
    loadGroupEventsBetween(todayISO, todayISO),
    loadSchoolWeather(session?.tenantId ?? null),
  ]);

  const corners = [
    {
      id: "classroom",
      label: t.panel.classroom.label,
      href: "/aula-virtual",
      icon: Presentation,
      tone: "blue",
    },
    {
      id: "grades",
      label: t.panel.grades.label,
      href: "/grupos",
      icon: GraduationCap,
      tone: "purple",
    },
    {
      id: "agenda",
      label: t.panel.agenda.label,
      href: "/agenda",
      icon: CalendarDays,
      tone: "yellow",
    },
    {
      id: "email",
      label: t.messages.hubMessagesTitle,
      href: "/comunicacion/mensajes",
      icon: Mail,
      tone: "rose",
      badgeCount: attention.unreadInboxCount,
    },
  ] as const satisfies readonly [
    HubQuincunxItem,
    HubQuincunxItem,
    HubQuincunxItem,
    HubQuincunxItem,
  ];

  const center: HubQuincunxItem = {
    id: "chat",
    label: t.messages.chatTitle,
    href: "/comunicacion/chat",
    icon: MessageCircle,
    tone: "green",
    badgeCount: attention.unreadChatCount,
  };

  return (
    <FadeIn className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <header className="flex flex-col gap-1">
          <h1 className="brand-page-title text-3xl text-foreground sm:text-4xl">
            {t.panel.title}
          </h1>
          <p className="text-sm font-medium text-foreground/55">
            {schoolName ?? t.common.fallbackSchool}
          </p>
          <TodayWeatherBlock locale={locale} todayISO={todayISO} weather={weather} />
        </header>
      </div>

      <PanelAttentionStrip attention={attention} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-10">
        <FadeIn delay={0.05}>
          <HubQuincunxGrid corners={corners} center={center} />
        </FadeIn>

        <FadeIn delay={0.18} className="h-full lg:sticky lg:top-6 lg:self-start">
          <ScheduleUpcoming lessons={schedule} todayEvents={todayEvents} />
        </FadeIn>
      </div>
    </FadeIn>
  );
}
