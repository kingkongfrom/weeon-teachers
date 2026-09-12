/**
 * Shared soft-tone palette. The **Panel General** card colours are the source of
 * truth for the whole teacher app: the hub cards, the virtual-classroom banners
 * and the schedule lesson tiles all read from here, so a palette change lands in
 * one place instead of drifting per screen. Light mode is a low-saturation
 * top-left gradient with dark ink; dark mode deepens to muted ink wells.
 */

export type HubTone = "blue" | "purple" | "yellow" | "green";

/** Every tinted surface — the hub tones plus the extra rose the schedule needs. */
export type Tone = HubTone | "rose";

/** Soft card/banner tint: subtle top-left gradient in light, muted well in dark. */
export const TONE_CARD: Record<Tone, string> = {
  blue: "bg-gradient-to-br from-[#dfe7ff] to-[#c3cffb] dark:from-[#2a3151] dark:to-[#232a45]",
  purple:
    "bg-gradient-to-br from-[#eae0fc] to-[#d6c9f6] dark:from-[#33295a] dark:to-[#2a2149]",
  yellow:
    "bg-gradient-to-br from-[#fdf1d3] to-[#f6e0ae] dark:from-[#3d3720] dark:to-[#332e1b]",
  green:
    "bg-gradient-to-br from-[#d3f2e0] to-[#bce7cf] dark:from-[#1f3d2e] dark:to-[#193327]",
  rose: "bg-gradient-to-br from-[#fbe0e8] to-[#f5cbd7] dark:from-[#432830] dark:to-[#38222a]",
};

/** Icon accent per tone: a deeper, saturated shade of the card colour so the
 * glyph reads on the tint (and a bright tint on the dark-mode surface). */
export const TONE_ICON: Record<Tone, string> = {
  blue: "text-[#3b5bdb] dark:text-[#9db4ff]",
  purple: "text-[#6741d9] dark:text-[#c9b8ff]",
  yellow: "text-[#9a6700] dark:text-[#eacb74]",
  green: "text-[#0f7a4b] dark:text-[#6fd6a1]",
  rose: "text-[#c2255c] dark:text-[#f7a8c4]",
};

/** Solid ink shades (no opacity) so contrast holds on the lightest pastels. */
export const TONE_INK = "text-[#1b2433] dark:text-white";
export const TONE_INK_MUTED = "text-[#39424f] dark:text-white/70";
export const TONE_INK_FAINT = "text-[#4c5563] dark:text-white/60";
