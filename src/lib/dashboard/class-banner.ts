/**
 * Class banner gradients for the virtual classroom, keyed by subject color
 * (aligned with the lesson/subject palette). Deep, muted 600–700 tones so the
 * banner stays brand-consistent and white type keeps its contrast.
 */
const BANNER: Record<string, string> = {
  red: "from-[#be123c] to-[#e11d48]",
  green: "from-[#047857] to-[#0d9488]",
  orange: "from-[#c2410c] to-[#ea580c]",
  purple: "from-[#5e25cc] to-[#2b59ff]",
  cyan: "from-[#0e7490] to-[#0891b2]",
  rose: "from-[#be185d] to-[#e11d48]",
  amber: "from-[#b45309] to-[#d97706]",
  lime: "from-[#4d7c0f] to-[#65a30d]",
  teal: "from-[#0f766e] to-[#0d9488]",
  indigo: "from-[#3730a3] to-[#3b5bdb]",
  pink: "from-[#be185d] to-[#db2777]",
  sky: "from-[#0369a1] to-[#0284c7]",
  fuchsia: "from-[#a21caf] to-[#c026d3]",
  blue: "from-[#2b59ff] to-[#5e25cc]",
};

export function classBannerClass(color: string | null | undefined): string {
  return BANNER[color ?? "blue"] ?? BANNER.blue;
}
