import { TONE_CARD, TONE_INK } from "@/lib/dashboard/tones";

/**
 * Class banner tone for the virtual classroom. Every header uses the shared
 * Panel General green instead of a per-subject pastel: the old per-subject
 * pastels flipped to near-white ink in dark mode and lost contrast, so the
 * banner stays consistent with the rest of the hub.
 */
export const CLASS_BANNER = `${TONE_CARD.green} ${TONE_INK}`;
