import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  GraduationCap,
  MessageSquare,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";

export const dynamic = "force-dynamic";

type ModuleTone =
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "violet"
  | "rose"
  | "fuchsia";

/** Solid card surface per module, painted with white type for contrast. */
const TONE_CARD: Record<ModuleTone, string> = {
  brand: "bg-brand-600 dark:bg-brand-700",
  accent: "bg-cyan-600 dark:bg-cyan-700",
  success: "bg-emerald-600 dark:bg-emerald-700",
  warning: "bg-amber-600 dark:bg-amber-700",
  violet: "bg-violet-600 dark:bg-violet-700",
  rose: "bg-rose-600 dark:bg-rose-700",
  fuchsia: "bg-fuchsia-600 dark:bg-fuchsia-700",
};

type DashboardModule = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: ModuleTone;
  /** Set when the module maps to a built section; omit to show "Próximamente". */
  href?: string;
  stat?: string;
};

/**
 * Landing / hub. This is the app's home: every part of the application is
 * reached from these cards, and every section keeps a way back here.
 */
export default async function InicioPage() {
  const session = await getTeacherSession();

  const [grupos, schedule, schoolName] = await Promise.all([
    loadTeacherGrupos(),
    loadTeacherSchedule(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
  ]);

  const modules: DashboardModule[] = [
    {
      id: "classroom",
      label: "Aula virtual",
      description: "Clases, materiales y tareas en un solo lugar.",
      icon: Presentation,
      tone: "brand",
      href: "/aula-virtual",
      stat: `${grupos.length} ${grupos.length === 1 ? "clase" : "clases"}`,
    },
    {
      id: "grades",
      label: "Calificaciones",
      description: "Notas y avance académico por grupo.",
      icon: GraduationCap,
      tone: "accent",
      href: "/grupos",
      stat: `${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"}`,
    },
    {
      id: "agenda",
      label: "Horario",
      description: "Tus clases de la semana, por grupo.",
      icon: CalendarDays,
      tone: "warning",
      href: "/horarios",
      stat: `${schedule.length} ${schedule.length === 1 ? "lección" : "lecciones"}`,
    },
    {
      id: "students",
      label: "Estudiantes",
      description: "Los estudiantes de tus grupos asignados.",
      icon: Users,
      tone: "success",
      href: "/estudiantes",
    },
    {
      id: "reports",
      label: "Reportes",
      description: "Los reportes de calificaciones que has subido.",
      icon: FileText,
      tone: "rose",
      href: "/reportes",
    },
    {
      id: "communication",
      label: "Comunicación",
      description: "Mensajes, avisos y notificaciones.",
      icon: MessageSquare,
      tone: "fuchsia",
    },
  ];

  return (
    <FadeIn className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">
          Panel general
        </h1>
        <p className="text-sm font-medium text-foreground/55">
          {schoolName ?? "Weeon School"}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          const card = (
            <div
              className={cn(
                "flex h-full flex-col rounded-2xl p-5 text-white transition-colors",
                TONE_CARD[module.tone],
                module.href &&
                  "group-hover:brightness-95 dark:group-hover:brightness-110",
              )}
            >
              <div className="flex items-start justify-between">
                <Icon className="h-7 w-7 text-white" strokeWidth={2.2} />
                {module.href ? (
                  <ArrowRight className="mt-1 h-4 w-4 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                ) : (
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Próximamente
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-base font-bold text-white">
                {module.label}
              </h2>
              <p className="mt-0.5 text-sm font-medium text-white/80">
                {module.description}
              </p>

              {module.stat ? (
                <p className="mt-auto pt-4 text-xs font-semibold text-white/75">
                  {module.stat}
                </p>
              ) : null}
            </div>
          );

          return module.href ? (
            <Link key={module.id} href={module.href} className="group">
              {card}
            </Link>
          ) : (
            <div key={module.id}>{card}</div>
          );
        })}
      </div>
    </FadeIn>
  );
}
