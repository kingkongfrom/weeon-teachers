/**
 * Shared soft-tone palette — aligned with weeon-tenants `hub-tones.ts`.
 * Hub cards, filter chips, roster avatars and section headers all read from here.
 */

export type HubTone = "blue" | "purple" | "yellow" | "green";

/** Hub tones plus rose for schedule / gradebook chips. */
export type Tone = HubTone | "rose";

/** Soft card/banner tint: subtle top-left gradient in light, jewel well in dark. */
export const TONE_CARD: Record<Tone, string> = {
  blue: "bg-gradient-to-br from-[#d8e9fb] to-[#c0d9f7] dark:from-[#16273f] dark:to-[#122035]",
  purple:
    "bg-gradient-to-br from-[#e6defb] to-[#d6c9f6] dark:from-[#241b45] dark:to-[#1d1738]",
  yellow:
    "bg-gradient-to-br from-[#fdeecd] to-[#f9dda0] dark:from-[#3a2a12] dark:to-[#2f230e]",
  green:
    "bg-gradient-to-br from-[#c9f0ec] to-[#abe3dc] dark:from-[#0f2f2c] dark:to-[#0c2624]",
  rose: "bg-gradient-to-br from-[#fbdee7] to-[#f6c9d8] dark:from-[#3a1622] dark:to-[#2e121c]",
};

const TONE_PILL_RING: Record<Tone, string> = {
  blue: "shadow-sm ring-1 ring-[#9ec5eb]/70 dark:ring-[#2a5080]/80",
  purple: "shadow-sm ring-1 ring-[#c4b0ef]/70 dark:ring-[#5b4a9a]/80",
  yellow: "shadow-sm ring-1 ring-[#f5d88a]/70 dark:ring-[#8a6b2a]/80",
  green: "shadow-sm ring-1 ring-[#7dd3c7]/70 dark:ring-[#2a6b62]/80",
  rose: "shadow-sm ring-1 ring-[#f0b8c8]/70 dark:ring-[#8a3a52]/80",
};

const TONE_PILL_LABEL: Record<Tone, string> = {
  blue: "text-[#124785] dark:text-[#bfdbfe]",
  purple: "text-[#4c1d95] dark:text-[#ddd6fe]",
  yellow: "text-[#92400e] dark:text-[#fde68a]",
  green: "text-[#0f4c47] dark:text-[#99f6e4]",
  rose: "text-[#9f1239] dark:text-[#fecdd3]",
};

const TONE_PILL_COUNT: Record<Tone, string> = {
  blue: "bg-white/60 text-[#124785] dark:bg-white/10 dark:text-[#bfdbfe]",
  purple: "bg-white/60 text-[#4c1d95] dark:bg-white/10 dark:text-[#ddd6fe]",
  yellow: "bg-white/60 text-[#92400e] dark:bg-white/10 dark:text-[#fde68a]",
  green: "bg-white/60 text-[#0f4c47] dark:bg-white/10 dark:text-[#99f6e4]",
  rose: "bg-white/60 text-[#9f1239] dark:bg-white/10 dark:text-[#fecdd3]",
};

const TONE_COUNT_IDLE: Record<Tone, string> = {
  blue: "bg-[#d8e9fb] text-[#1e4d8c] dark:bg-[#16273f] dark:text-[#93c5fd]/85",
  purple: "bg-[#e6defb] text-[#5b21b6] dark:bg-[#241b45] dark:text-[#c4b5fd]/85",
  yellow: "bg-[#fdeecd] text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]/85",
  green: "bg-[#c9f0ec] text-[#115e59] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]/85",
  rose: "bg-[#fbdee7] text-[#9f1239] dark:bg-[#3a1622] dark:text-[#fda4af]/85",
};

/** Saturated gradient for hub icons and roster initials (white glyph). */
export const TONE_AVATAR: Record<Tone, string> = {
  blue: "bg-gradient-to-br from-[#5b9fd9] to-[#2563b0] dark:from-[#3b82c4] dark:to-[#1e4a7a]",
  purple: "bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] dark:from-[#8b6fd4] dark:to-[#5b21b6]",
  yellow: "bg-gradient-to-br from-[#fbbf24] to-[#d97706] dark:from-[#d4a017] dark:to-[#b45309]",
  green: "bg-gradient-to-br from-[#2dd4bf] to-[#0f766e] dark:from-[#14b8a6] dark:to-[#115e59]",
  rose: "bg-gradient-to-br from-[#fb7185] to-[#e11d48] dark:from-[#f43f5e] dark:to-[#be123c]",
};

/** @deprecated Use tone-matched `TONE_AVATAR` chips instead. */
export const CHIP_ICON = "text-brand-700 dark:text-brand-300";

/** Icon accent per tone (non-chip contexts). */
export const TONE_ICON: Record<Tone, string> = {
  blue: "text-[#2563eb] dark:text-[#7fb3f7]",
  purple: "text-[#7c3aed] dark:text-[#b9a3f7]",
  yellow: "text-[#b45309] dark:text-[#fbbf24]",
  green: "text-[#0f766e] dark:text-[#5eead4]",
  rose: "text-[#be123c] dark:text-[#fda4af]",
};

export const TONE_INK = "text-[#10201d] dark:text-[#e6eef7]";
export const TONE_INK_MUTED = "text-[#3c4a47] dark:text-[#e6eef7]/70";
export const TONE_INK_FAINT = "text-[#55635f] dark:text-[#e6eef7]/60";

/** Soft pill / filter chip — same pattern as weeon-tenants Comunidad tabs. */
export function hubTonePill(tone: Tone) {
  return {
    active: `${TONE_CARD[tone]} ${TONE_PILL_RING[tone]}`,
    label: TONE_PILL_LABEL[tone],
    countOnActive: TONE_PILL_COUNT[tone],
    countIdle: TONE_COUNT_IDLE[tone],
    avatar: TONE_AVATAR[tone],
  };
}

export function hubFilterChipClass(tone: Tone, active: boolean): string {
  if (active) {
    return `${TONE_CARD[tone]} ${TONE_PILL_RING[tone]} ${TONE_PILL_LABEL[tone]}`;
  }
  return "border border-border bg-surface text-foreground/65 hover:bg-surface-muted";
}

/** Active filter / tab chip (flat convenience map). */
export const TONE_PILL: Record<Tone, string> = {
  blue: hubFilterChipClass("blue", true),
  purple: hubFilterChipClass("purple", true),
  yellow: hubFilterChipClass("yellow", true),
  green: hubFilterChipClass("green", true),
  rose: hubFilterChipClass("rose", true),
};

/** Per-item tone rotation for lists of cards (grupos, student subjects). */
export const TONE_CYCLE: Tone[] = ["blue", "purple", "green", "yellow", "rose"];
