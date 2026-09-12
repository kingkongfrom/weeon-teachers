/**
 * Class banner tone for the virtual classroom. Every header uses the same green
 * gradient instead of a per-subject pastel: the old per-subject pastels flipped
 * to near-white ink in dark mode and dropped text contrast. The subject identity
 * now rides in a badge, and the header text uses a fixed dark-green ink so it
 * holds in both themes.
 */
export const CLASS_BANNER =
  "from-[#6ac99b] to-[#3fb47e] text-[#062b1a]";

/** Subject pill shown on the banner (name only — no per-subject colour). */
export const CLASS_BANNER_BADGE =
  "border-white/15 bg-gradient-to-br from-[#0a3a27] to-[#14553b] text-white";
