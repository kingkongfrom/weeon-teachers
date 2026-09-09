/** Calendar color chips — aligned with weeon-tenants LESSON_COLORS. */

const SUBJECT_DOT: Record<string, string> = {
  red: "bg-red-500",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  purple: "bg-brand-600",
  cyan: "bg-cyan-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  lime: "bg-lime-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  pink: "bg-pink-500",
  sky: "bg-sky-500",
  fuchsia: "bg-fuchsia-500",
  blue: "bg-blue-500",
};

export function subjectDotClass(color: string | null | undefined): string {
  return SUBJECT_DOT[color ?? "blue"] ?? SUBJECT_DOT.blue;
}

export function subjectChipClass(color: string | null | undefined): string {
  switch (color) {
    case "red":
      return "border-red-200/80 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/45 dark:text-red-300";
    case "green":
      return "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/45 dark:text-emerald-300";
    case "orange":
      return "border-orange-200/80 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/45 dark:text-orange-300";
    case "purple":
      return "border-brand-200/80 bg-brand-50 text-brand-800 dark:border-brand-800/70 dark:bg-brand-950/45 dark:text-brand-300";
    case "cyan":
      return "border-cyan-200/80 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/45 dark:text-cyan-300";
    case "rose":
      return "border-rose-200/80 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/45 dark:text-rose-300";
    case "amber":
      return "border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-300";
    case "lime":
      return "border-lime-200/80 bg-lime-50 text-lime-800 dark:border-lime-900/60 dark:bg-lime-950/45 dark:text-lime-300";
    case "teal":
      return "border-teal-200/80 bg-teal-50 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/45 dark:text-teal-300";
    case "indigo":
      return "border-indigo-200/80 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/45 dark:text-indigo-300";
    case "pink":
      return "border-pink-200/80 bg-pink-50 text-pink-800 dark:border-pink-900/60 dark:bg-pink-950/45 dark:text-pink-300";
    case "sky":
      return "border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/45 dark:text-sky-300";
    case "fuchsia":
      return "border-fuchsia-200/80 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/45 dark:text-fuchsia-300";
    case "blue":
    default:
      return "border-blue-200/80 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/45 dark:text-blue-300";
  }
}
