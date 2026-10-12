import {
  CalendarDays,
  FileBarChart,
  GraduationCap,
  MessageSquare,
  Presentation,
} from "lucide-react";
import {
  HubQuincunxGrid,
  type HubQuincunxItem,
} from "@/components/dashboard/hub-quincunx-grid";
import { PanelAttentionStrip } from "@/components/dashboard/panel-attention";
import { FadeIn } from "@/components/motion/fade-in";
import { ScheduleUpcoming } from "@/components/schedule/schedule-upcoming";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { schoolToday } from "@/lib/attendance/model";
import { loadGroupEventsBetween } from "@/lib/dashboard/calendar";
import { loadPanelAttention } from "@/lib/dashboard/panel-attention";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Landing / hub — five-tile grid plus today's schedule. */
export default async function InicioPage() {
  const session = await getTeacherSession();
  const t = await getT();

  const todayISO = schoolToday();
  const [schedule, schoolName, attention, todayEvents] = await Promise.all([
    loadTeacherSchedule(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
    loadPanelAttention(),
    loadGroupEventsBetween(todayISO, todayISO),
  ]);

  const unreadComms = attention.unreadChatCount + attention.unreadInboxCount;

  const corners = [
    {
      id: "classroom",
      label: t.panel.classroom.label,
      href: "/aula-virtual",
      icon: Presentation,
      accent: "#4F8CFF",
    },
    {
      id: "grades",
      label: t.panel.grades.label,
      href: "/grupos",
      icon: GraduationCap,
      accent: "#8B5CF6",
    },
    {
      id: "agenda",
      label: t.panel.agenda.label,
      href: "/agenda",
      icon: CalendarDays,
      accent: "#F5A623",
    },
    {
      id: "communication",
      label: t.panel.communication.label,
      href: "/comunicacion",
      icon: MessageSquare,
      accent: "#2FBF9A",
      badgeCount: unreadComms,
    },
  ] as const satisfies readonly [
    HubQuincunxItem,
    HubQuincunxItem,
    HubQuincunxItem,
    HubQuincunxItem,
  ];

  const center: HubQuincunxItem = {
    id: "reports",
    label: t.reportes.title,
    href: "/reportes",
    icon: FileBarChart,
    accent: "#E86FA0",
  };

  return (
    <FadeIn className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-3xl text-foreground sm:text-4xl">
          {t.panel.title}
        </h1>
        <p className="text-sm font-medium text-foreground/55">
          {schoolName ?? t.common.fallbackSchool}
        </p>
      </header>

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
