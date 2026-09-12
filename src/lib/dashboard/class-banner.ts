/**
 * Class banner gradients for the virtual classroom, keyed by subject color
 * (aligned with the lesson/subject palette). Desaturated mid tones keep the
 * subject colour recognisable but easy on the eye, while white type keeps its
 * contrast. Purple/blue stay the brand gradient.
 */
const BANNER: Record<string, string> = {
  red: "from-[#a6586a] to-[#95505f]",
  green: "from-[#33795f] to-[#2c6b56]",
  orange: "from-[#a9773f] to-[#966a37]",
  purple: "from-[#5e25cc] to-[#2b59ff]",
  cyan: "from-[#3d7f92] to-[#356f81]",
  rose: "from-[#a65873] to-[#955064]",
  amber: "from-[#9c7a37] to-[#8a6c30]",
  lime: "from-[#5f7a33] to-[#556c2d]",
  teal: "from-[#33796f] to-[#2c6b62]",
  indigo: "from-[#4b4f9c] to-[#424588]",
  pink: "from-[#9c5580] to-[#8a4a71]",
  sky: "from-[#3d6f95] to-[#356185]",
  fuchsia: "from-[#8f4a95] to-[#7f4184]",
  blue: "from-[#3b5bdb] to-[#5e25cc]",
};

export function classBannerClass(color: string | null | undefined): string {
  return BANNER[color ?? "blue"] ?? BANNER.blue;
}
