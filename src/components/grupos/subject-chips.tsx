import { subjectChipClass } from "@/lib/dashboard/lesson-colors";
import type { GrupoSubject } from "@/lib/dashboard/grupos";

/**
 * Subject chips.
 *
 * `max` caps how many are drawn and replaces the rest with a "+N" chip whose
 * title lists the hidden names. It exists for the COMPACT phone layout: five
 * subjects wrapped to three lines and made the Aula virtual class card 86px of
 * chips alone, so a teacher with several classes scrolled for screens.
 *
 * Omitted (the default) draws every chip — the roomier desktop layout.
 */
export function SubjectChips({
  subjects,
  className = "",
  size = "sm",
  max,
}: {
  subjects: GrupoSubject[];
  className?: string;
  size?: "sm" | "md";
  max?: number;
}) {
  if (subjects.length === 0) return null;

  const chip =
    size === "md"
      ? "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold"
      : "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold";

  const shown = typeof max === "number" ? subjects.slice(0, max) : subjects;
  const hidden = subjects.slice(shown.length);

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((subject) => (
        <li key={subject.id}>
          <span className={`${chip} ${subjectChipClass(subject.color)}`}>
            <span className="truncate">{subject.name}</span>
          </span>
        </li>
      ))}
      {hidden.length > 0 ? (
        <li>
          <span
            className={`${chip} border-border bg-surface-muted text-foreground/55`}
            title={hidden.map((subject) => subject.name).join(", ")}
          >
            +{hidden.length}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
