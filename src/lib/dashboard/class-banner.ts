/**
 * Class banner gradients for the virtual classroom, keyed by subject color
 * (aligned with the lesson/subject palette). Falls back to a neutral blue.
 */
const BANNER: Record<string, string> = {
  red: "from-rose-500 to-red-600",
  green: "from-emerald-500 to-teal-600",
  orange: "from-orange-400 to-amber-500",
  purple: "from-[#5e25cc] to-[#2b59ff]",
  cyan: "from-cyan-500 to-sky-600",
  rose: "from-rose-400 to-pink-500",
  amber: "from-amber-400 to-orange-500",
  lime: "from-lime-500 to-emerald-500",
  teal: "from-teal-500 to-cyan-600",
  indigo: "from-indigo-500 to-blue-600",
  pink: "from-pink-400 to-fuchsia-500",
  sky: "from-sky-400 to-blue-500",
  fuchsia: "from-fuchsia-500 to-purple-600",
  blue: "from-blue-500 to-indigo-600",
};

export function classBannerClass(color: string | null | undefined): string {
  return BANNER[color ?? "blue"] ?? BANNER.blue;
}
