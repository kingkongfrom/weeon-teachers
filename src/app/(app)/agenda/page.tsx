import {
  BellRing,
  CalendarDays,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { HubModuleCard } from "@/components/dashboard/hub-module-card";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/layout/page-header";
import { getT } from "@/lib/i18n/server";
import type { HubTone } from "@/lib/dashboard/tones";

export const dynamic = "force-dynamic";

type AgendaModule = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: HubTone;
  href?: string;
};

/** Agenda hub: timetable, school events, and monthly calendar. */
export default async function AgendaPage() {
  const t = await getT();

  const modules: AgendaModule[] = [
    {
      id: "horarios",
      label: t.agenda.horarios.label,
      description: t.agenda.horarios.description,
      icon: Clock,
      tone: "blue",
      href: "/horarios",
    },
    {
      id: "eventos",
      label: t.agenda.eventos.label,
      description: t.agenda.eventos.description,
      icon: BellRing,
      tone: "green",
      href: "/agenda/eventos",
    },
    {
      id: "calendario",
      label: t.agenda.calendario.label,
      description: t.agenda.calendario.description,
      icon: CalendarDays,
      tone: "purple",
      href: "/agenda/calendario",
    },
  ];

  return (
    <FadeIn className="flex flex-col gap-6">
      <PageHeader
        title={t.agenda.title}
        description={t.agenda.description}
        backHref="/inicio"
      />

      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-4">
        {modules.map((module, index) => (
          <FadeIn key={module.id} delay={0.05 + index * 0.04} className="h-full">
            <HubModuleCard
              tone={module.tone}
              icon={module.icon}
              title={module.label}
              description={module.description}
              upcomingLabel={!module.href ? t.panel.upcoming : undefined}
              href={module.href}
            />
          </FadeIn>
        ))}
      </div>
    </FadeIn>
  );
}
