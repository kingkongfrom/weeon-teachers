import {
  BellRing,
  CalendarDays,
  Clock,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { HubModuleCard } from "@/components/dashboard/hub-module-card";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/layout/page-header";
import { getT } from "@/lib/i18n/server";
import type { HubTone } from "@/lib/dashboard/tones";
import { cn } from "@/lib/utils";

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
      id: "calendario",
      label: t.agenda.calendario.label,
      description: t.agenda.calendario.description,
      icon: CalendarDays,
      tone: "purple",
      href: "/agenda/calendario",
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
      id: "excursiones",
      label: t.agenda.excursiones.label,
      description: t.agenda.excursiones.description,
      icon: MapPin,
      tone: "yellow",
      href: "/agenda/excursiones",
    },
  ];

  const [horarios, ...rest] = modules;

  return (
    <FadeIn className="flex flex-col gap-6">
      <PageHeader
        title={t.agenda.title}
        description={t.agenda.description}
      />

      <div className="flex flex-col gap-3 sm:gap-4">
        <FadeIn>
          <HubModuleCard
            layout="lead"
            tone={horarios.tone}
            icon={horarios.icon}
            title={horarios.label}
            description={horarios.description}
            href={horarios.href}
          />
        </FadeIn>

        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {rest.map((module, index) => (
            <FadeIn
              key={module.id}
              delay={0.06 + index * 0.04}
              className={cn("h-full", index === rest.length - 1 && "sm:col-span-2 lg:col-span-1")}
            >
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
      </div>
    </FadeIn>
  );
}
