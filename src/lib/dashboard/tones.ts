/**
 * Shared soft-tone palette — "Noche" direction (chosen). The **Panel General**
 * card colours are the source of truth for the whole teacher app: the hub
 * cards, the virtual-classroom banners and the schedule lesson tiles all read
 * from here, so a palette change lands in one place instead of drifting per
 * screen.
 *
 * Jewel tones over a deep teal-navy field: ocean, violet, mango, teal, berry.
 * Light mode is a cool mist with soft tints; dark mode deepens to jewel wells
 * on a flat field. Icon chips blend into the card tint (translucent white).
 */

export type HubTone = "blue" | "purple" | "yellow" | "green";

/** Every tinted surface — the hub tones plus the extra rose the schedule needs. */
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

/** Icon accent per tone: a deeper, saturated shade of the card colour so the
 * glyph reads on the tint (and a bright tint on the dark-mode surface). */
export const TONE_ICON: Record<Tone, string> = {
  blue: "text-[#2563eb] dark:text-[#7fb3f7]",
  purple: "text-[#7c3aed] dark:text-[#b9a3f7]",
  yellow: "text-[#b45309] dark:text-[#fbbf24]",
  green: "text-[#0f766e] dark:text-[#5eead4]",
  rose: "text-[#be123c] dark:text-[#fda4af]",
};

/** Hub-card chip icon ink — brand indigo, matching the date pill so every card
 * icon reads as the same badge regardless of the card's tone. */
export const CHIP_ICON = "text-brand-700 dark:text-brand-300";

/** Solid ink shades (no opacity) so contrast holds on the lightest tints. */
export const TONE_INK = "text-[#10201d] dark:text-[#e6eef7]";
export const TONE_INK_MUTED = "text-[#3c4a47] dark:text-[#e6eef7]/70";
export const TONE_INK_FAINT = "text-[#55635f] dark:text-[#e6eef7]/60";

/** Flat tint + ink for small active pills (mailbox folders, filters) — the
 * card's deep stop as a solid wash, no gradient. */
export const TONE_PILL: Record<Tone, string> = {
  blue: "bg-[#c0d9f7] text-[#2563eb] dark:bg-[#16273f] dark:text-[#7fb3f7]",
  purple: "bg-[#d6c9f6] text-[#7c3aed] dark:bg-[#241b45] dark:text-[#b9a3f7]",
  yellow: "bg-[#f9dda0] text-[#b45309] dark:bg-[#3a2a12] dark:text-[#fbbf24]",
  green: "bg-[#dcf0ec] text-[#3f6f66] dark:bg-[#152423] dark:text-[#9cc9bf]",
  rose: "bg-[#f6c9d8] text-[#be123c] dark:bg-[#3a1622] dark:text-[#fda4af]",
};

/** Per-item tone rotation for lists of cards (grupos, student subjects) —
 * the same order everywhere so a group keeps its colour across screens. */
export const TONE_CYCLE: Tone[] = ["blue", "purple", "green", "yellow", "rose"];
