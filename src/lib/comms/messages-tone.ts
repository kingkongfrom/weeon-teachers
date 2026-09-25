import { HUB_TONE_AVATAR, hubFilterChipClass, hubTonePill } from "@/lib/dashboard/hub-tones";

/** Green lane — matches the Messages card on /dashboard/comms. */
const green = hubTonePill("green");

export const messagesTone = {
  primaryButton: "bg-[#0891B2] text-white shadow-sm transition-colors hover:bg-[#0e7490]",
  activeNav: hubFilterChipClass("green", true),
  accentText: "text-[#0f766e] dark:text-[#14b8a6]",
  accentMuted: green.countIdle,
  dropRing: "ring-2 ring-[#7dd3c7]/70 dark:ring-[#2a6b62]/80",
  dropBg: "bg-[#c9f0ec]/50 dark:bg-[#0f2f2c]/50",
  unreadDot: "bg-[#0f766e] dark:bg-[#14b8a6]",
  avatar: `${HUB_TONE_AVATAR.green} text-white shadow-sm`,
  linkHover:
    "text-[#0f766e] hover:bg-[#c9f0ec]/70 dark:text-[#14b8a6] dark:hover:bg-[#0f2f2c]/70",
  toggleOn: "bg-[#0f766e]",
  countBadge: "bg-[#0f766e] text-white",
  selectedChip: "border-[#0f766e] bg-[#0f766e] text-white",
  unreadFilterActive: hubFilterChipClass("green", true),
} as const;
