import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GraduationCap,
  MessageSquare,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { loadMyReportCount } from "@/lib/dashboard/reports";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type ModuleTone = "blue" | "purple" | "yellow" | "whatsapp";

/** Soft, brand-anchored card tints (low saturation, subtle top-left gradient)
 * so the hub reads as one product rather than a candy set. Dark mode deepens to
 * muted ink wells. */
const TONE_CARD: Record<ModuleTone, string> = {
  blue: "bg-gradient-to-br from-[#dfe7ff] to-[#c3cffb] dark:from-[#2a3151] dark:to-[#232a45]",
  purple: "bg-gradient-to-br from-[#eae0fc] to-[#d6c9f6] dark:from-[#33295a] dark:to-[#2a2149]",
  yellow: "bg-gradient-to-br from-[#fdf1d3] to-[#f6e0ae] dark:from-[#3d3720] dark:to-[#332e1b]",
  whatsapp: "bg-gradient-to-br from-[#d3f2e0] to-[#bce7cf] dark:from-[#1f3d2e] dark:to-[#193327]",
};

/** Icon accent per tone: a deeper, saturated shade of the card colour so the
 * glyph reads on the tint (and a bright tint on the dark-mode surface). */
const TONE_ICON: Record<ModuleTone, string> = {
  blue: "text-[#3b5bdb] dark:text-[#9db4ff]",
  purple: "text-[#6741d9] dark:text-[#c9b8ff]",
  yellow: "text-[#9a6700] dark:text-[#eacb74]",
  whatsapp: "text-[#0f7a4b] dark:text-[#6fd6a1]",
};

/** Solid ink shades (no opacity) so contrast holds on the lightest pastels. */
const CARD_INK = "text-[#1b2433] dark:text-white";
const CARD_INK_MUTED = "text-[#39424f] dark:text-white/70";
const CARD_INK_FAINT = "text-[#4c5563] dark:text-white/60";

type DashboardModule = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: ModuleTone;
  /** Set when the module maps to a built section; omit to show "Próximamente". */
  href?: string;
  /** Footer metric — every built card carries its own, unique number. */
  stat?: string;
};

/**
 * Landing / hub. This is the app's home: every part of the application is
 * reached from these cards, and every section keeps a way back here.
 */
export default async function InicioPage() {
  const session = await getTeacherSession();
  const t = await getT();

  const [grupos, schedule, schoolName, reportCount] = await Promise.all([
    loadTeacherGrupos(),
    loadTeacherSchedule(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
    loadMyReportCount(),
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
      id: "reports",
      label: t.panel.reports.label,
      description: t.panel.reports.description,
      icon: FileText,
      tone: "yellow",
      href: "/reportes",
      stat: t.panel.reportsCount(reportCount),
    },
    {
      id: "communication",
      label: t.panel.communication.label,
      description: t.panel.communication.description,
      icon: MessageSquare,
      tone: "whatsapp",
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

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const upcoming = !module.href;
          const card = (
            <div
              className={cn(
                "flex h-full flex-col rounded-2xl p-5 ring-1 ring-inset transition-all",
                TONE_CARD[module.tone],
                CARD_INK,
                upcoming
                  ? "ring-black/5 dark:ring-white/10"
                  : "ring-black/5 group-hover:brightness-[0.96] group-hover:ring-black/15 dark:group-hover:brightness-110 dark:group-hover:ring-white/20",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/45 dark:bg-white/10">
                  <Icon
                    className={cn("h-5 w-5", TONE_ICON[module.tone])}
                    strokeWidth={2.2}
                  />
                </div>
                <h2 className="min-w-0 text-xl font-bold leading-tight">
                  {module.label}
                </h2>
                {upcoming ? null : (
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-55 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                )}
              </div>

              <p className={cn("mt-3 text-sm font-medium", CARD_INK_MUTED)}>
                {module.description}
              </p>

              <div className="mt-auto pt-5">
                {module.stat ? (
                  <p className={cn("text-xs font-semibold", CARD_INK_FAINT)}>
                    {module.stat}
                  </p>
                ) : upcoming ? (
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

      <section className="flex flex-col gap-3">
        <h2 className="brand-page-title text-lg text-foreground">
          {t.panel.weekTitle}
        </h2>

        {schedule.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground/60">
              {t.panel.noLessons}
            </p>
          </div>
        ) : (
          <ScheduleGrid lessons={schedule} />
        )}
      </section>
    </FadeIn>
  );
}
