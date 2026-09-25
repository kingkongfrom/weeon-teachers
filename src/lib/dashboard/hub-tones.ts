/** Soft card tints for the dashboard hub — aligned with weeon-teachers panel cards. */

export type HubTone = "blue" | "purple" | "yellow" | "green";

/** Card body stays white. Tone shows up as the ring, title, and icon chip. */
export const HUB_TONE_CARD: Record<HubTone, string> = {
  blue: "bg-surface",
  purple: "bg-surface",
  yellow: "bg-surface",
  green: "bg-surface",
};

export const HUB_TONE_INK = "text-[#10201d] dark:text-[#e6eef7]";

/** Group card header — matches weeon-teachers virtual classroom cards. */
export const CLASS_GROUP_BANNER = `${HUB_TONE_CARD.green} ${HUB_TONE_INK}`;
export const HUB_TONE_INK_MUTED = "text-[#3c4a47] dark:text-[#e6eef7]/70";
export const HUB_TONE_INK_FAINT = "text-[#55635f] dark:text-[#e6eef7]/60";

export const HUB_CHIP_ICON = "text-brand-700 dark:text-brand-300";

export type PeopleTabId = "teachers" | "students" | "parents";

/** Hub tone per Comunidad list — shared by tab pills and roster avatars. */
export const PEOPLE_ROSTER_TONE: Record<PeopleTabId, HubTone> = {
  teachers: "blue",
  students: "purple",
  parents: "green",
};

const HUB_TONE_PILL_RING: Record<HubTone, string> = {
  blue: "shadow-sm ring-1 ring-[#9ec5eb]/70 dark:ring-[#2a5080]/80",
  purple: "shadow-sm ring-1 ring-[#c4b0ef]/70 dark:ring-[#5b4a9a]/80",
  yellow: "shadow-sm ring-1 ring-[#f5d88a]/70 dark:ring-[#8a6b2a]/80",
  green: "shadow-sm ring-1 ring-[#7dd3c7]/70 dark:ring-[#2a6b62]/80",
};

const HUB_TONE_PILL_LABEL: Record<HubTone, string> = {
  blue: "text-[#124785] dark:text-[#bfdbfe]",
  purple: "text-[#4c1d95] dark:text-[#ddd6fe]",
  yellow: "text-[#92400e] dark:text-[#fde68a]",
  green: "text-[#0f4c47] dark:text-[#99f6e4]",
};

const HUB_TONE_PILL_COUNT: Record<HubTone, string> = {
  blue: "bg-white/60 text-[#124785] dark:bg-white/10 dark:text-[#bfdbfe]",
  purple: "bg-white/60 text-[#4c1d95] dark:bg-white/10 dark:text-[#ddd6fe]",
  yellow: "bg-white/60 text-[#92400e] dark:bg-white/10 dark:text-[#fde68a]",
  green: "bg-white/60 text-[#0f4c47] dark:bg-white/10 dark:text-[#99f6e4]",
};

const HUB_TONE_COUNT_IDLE: Record<HubTone, string> = {
  blue: "bg-[#d8e9fb] text-[#1e4d8c] dark:bg-[#16273f] dark:text-[#93c5fd]/85",
  purple: "bg-[#e6defb] text-[#5b21b6] dark:bg-[#241b45] dark:text-[#c4b5fd]/85",
  yellow: "bg-[#fdeecd] text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]/85",
  green: "bg-[#c9f0ec] text-[#115e59] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]/85",
};

/** Flat marketing icon chips (white glyph). */
export const HUB_TONE_AVATAR: Record<HubTone, string> = {
  blue: "bg-[#2563b0]",
  purple: "bg-[#7c3aed]",
  yellow: "bg-[#d97706]",
  green: "bg-[#0f766e]",
};

export function peopleTabPill(tab: PeopleTabId) {
  const tone = PEOPLE_ROSTER_TONE[tab];
  return hubTonePill(tone);
}

/** Soft pill / filter chip — same pattern as Comunidad tabs, no solid brand buttons. */
export function hubTonePill(tone: HubTone) {
  return {
    active: `${HUB_TONE_CARD[tone]} ${HUB_TONE_PILL_RING[tone]}`,
    label: HUB_TONE_PILL_LABEL[tone],
    countOnActive: HUB_TONE_PILL_COUNT[tone],
    countIdle: HUB_TONE_COUNT_IDLE[tone],
    avatar: HUB_TONE_AVATAR[tone],
  };
}

export function hubFilterChipClass(tone: HubTone, active: boolean): string {
  if (active) {
    return `${HUB_TONE_CARD[tone]} ${HUB_TONE_PILL_RING[tone]} ${HUB_TONE_PILL_LABEL[tone]}`;
  }
  return "border border-border bg-surface text-foreground/65 hover:bg-surface-muted";
}

/** Active filter / tab chip (flat convenience map). */
export const TONE_PILL: Record<HubTone, string> = {
  blue: hubFilterChipClass("blue", true),
  purple: hubFilterChipClass("purple", true),
  yellow: hubFilterChipClass("yellow", true),
  green: hubFilterChipClass("green", true),
};

export const TONE_AVATAR = HUB_TONE_AVATAR;
