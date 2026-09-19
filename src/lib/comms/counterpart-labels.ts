import type { Locale } from "@/lib/i18n/config";
import { tComms } from "@/lib/i18n/translate-comms";
import type { CommsMessageKey } from "@/lib/i18n/comms-messages";

function countLabel(
  locale: Locale,
  oneKey: CommsMessageKey,
  manyKey: CommsMessageKey,
  n: number,
): string {
  return n === 1 ? tComms(locale, oneKey) : tComms(locale, manyKey, { n });
}

export function counterpartLabels(locale: Locale) {
  return {
    noRecipients: tComms(locale, "comms.noRecipients"),
    recipientCount: (n: number) =>
      countLabel(locale, "comms.recipientOne", "comms.recipientMany", n),
    parentCount: (n: number) => countLabel(locale, "comms.parentOne", "comms.parentMany", n),
    studentCount: (n: number) => countLabel(locale, "comms.studentOne", "comms.studentMany", n),
    teacherCount: (n: number) => countLabel(locale, "comms.teacherOne", "comms.teacherMany", n),
    customCount: (n: number) => countLabel(locale, "comms.customOne", "comms.customMany", n),
  };
}
