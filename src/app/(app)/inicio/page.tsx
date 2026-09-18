import {
  CalendarDays,
  GraduationCap,
  MessageSquare,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { HubModuleCard } from "@/components/dashboard/hub-module-card";
import { FadeIn } from "@/components/motion/fade-in";
import { ScheduleUpcoming } from "@/components/schedule/schedule-upcoming";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { getT } from "@/lib/i18n/server";
import type { HubTone } from "@/lib/dashboard/tones";

export const dynamic = "force-dynamic";

type DashboardModule = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: HubTone;
  href?: string;
  stat?: string;
};

/** Landing / hub — every section is reached from these tone cards. */
export default async function InicioPage() {
  const session = await getTeacherSession();
  const t = await getT();

  const [grupos, schedule, schoolName] = await Promise.all([
    loadTeacherGrupos(),
    loadTeacherSchedule(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
  ]);

  const subjectCount = grupos.reduce((total, grupo) => total + grupo.subjects.length, 0);

  const modules: DashboardModule[] = [
    {
      id: "classroom",
      label: t.panel.classroom.label,
      description: t.panel.classroom.description,
      icon: Presentation,
      tone: "blue",
      href: "/aula-virtual",
      stat: t.panel.classesCount(grupos.length),
    },
    {
      id: "grades",
      label: t.panel.grades.label,
      description: t.panel.grades.description,
      icon: GraduationCap,
      tone: "purple",
      href: "/grupos",
      stat: t.panel.subjectsCount(subjectCount),
    },
    {
      id: "agenda",
      label: t.panel.agenda.label,
      description: t.panel.agenda.description,
      icon: CalendarDays,
      tone: "yellow",
      href: "/agenda",
      stat: t.panel.agendaCount(schedule.length),
    },
    {
      id: "communication",
      label: t.panel.communication.label,
      description: t.panel.communication.description,
      icon: MessageSquare,
      tone: "green",
      href: "/comunicacion",
    },
  ];

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch lg:gap-10">
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 sm:gap-5">
          {modules.map((module, index) => (
            <FadeIn key={module.id} delay={0.05 + index * 0.04} className="h-full">
              <HubModuleCard
                tone={module.tone}
                icon={module.icon}
                title={module.label}
                description={module.description}
                stat={module.stat}
                upcomingLabel={!module.href ? t.panel.upcoming : undefined}
                href={module.href}
                className="min-h-[8.25rem] sm:min-h-[9.25rem] sm:p-6"
              />
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.18} className="h-full lg:sticky lg:top-6 lg:self-start">
          <ScheduleUpcoming lessons={schedule} />
        </FadeIn>
      </div>
    </FadeIn>
  );
}
