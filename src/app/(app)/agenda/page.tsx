import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/layout/page-header";
import { getT } from "@/lib/i18n/server";
import {
  TONE_CARD,
  TONE_ICON,
  TONE_INK,
  TONE_INK_MUTED,
  type HubTone,
} from "@/lib/dashboard/tones";

export const dynamic = "force-dynamic";

type AgendaModule = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: HubTone;
  /** Set when the section is built; omit to show "Próximamente". */
  href?: string;
};

/**
 * Agenda hub: every scheduling surface in one place — the weekly timetable,
 * school events, and the monthly calendar. Reached from Panel general.
 */
export default async function AgendaPage() {
  const t = await getT();

  const modules: AgendaModule[] = [
    {
      id: "horarios",
      label: t.agenda.horarios.label,
      description: t.agenda.horarios.description,
      icon: CalendarDays,
      tone: "blue",
      href: "/horarios",
    },
    {
      id: "eventos",
      label: t.agenda.eventos.label,
      description: t.agenda.eventos.description,
      icon: PartyPopper,
      tone: "green",
      href: "/agenda/eventos",
    },
    {
      id: "calendario",
      label: t.agenda.calendario.label,
      description: t.agenda.calendario.description,
      icon: CalendarRange,
      tone: "purple",
    },
  ];

  return (
    <FadeIn className="flex flex-col gap-6">
      <PageHeader
        title={t.agenda.title}
        description={t.agenda.description}
        backHref="/inicio"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const upcoming = !module.href;
          const card = (
            <div
              className={cn(
                "flex h-full flex-col rounded-2xl p-5 ring-1 ring-inset transition-all",
                TONE_CARD[module.tone],
                TONE_INK,
                upcoming
                  ? "ring-black/5 dark:ring-white/10"
                  : "ring-black/5 group-hover:brightness-[0.96] group-hover:ring-black/15 dark:group-hover:brightness-110 dark:group-hover:ring-white/20",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/45 dark:bg-white/10">
                  <Icon className={cn("h-5 w-5", TONE_ICON[module.tone])} strokeWidth={2.2} />
                </div>
                <h2 className="min-w-0 text-xl font-bold leading-tight">{module.label}</h2>
                {upcoming ? null : (
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-55 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                )}
              </div>

              <p className={cn("mt-3 text-sm font-medium", TONE_INK_MUTED)}>
                {module.description}
              </p>

              <div className="mt-auto pt-5">
                {upcoming ? (
                  <span className="inline-flex rounded-full border border-black/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide dark:border-white/25">
                    {t.panel.upcoming}
                  </span>
                ) : null}
              </div>
            </div>
          );

          const wrapped = module.href ? (
            <Link href={module.href} className="group block h-full">
              {card}
            </Link>
          ) : (
            card
          );

          return (
            <FadeIn key={module.id} delay={0.05 + index * 0.04} className="h-full">
              {wrapped}
            </FadeIn>
          );
        })}
      </div>
    </FadeIn>
  );
}
