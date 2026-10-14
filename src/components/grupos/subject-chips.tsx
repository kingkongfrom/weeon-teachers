import { subjectChipClass } from "@/lib/dashboard/lesson-colors";
import type { GrupoSubject } from "@/lib/dashboard/grupos";

export function SubjectChips({
  subjects,
  className = "",
  size = "sm",
}: {
  subjects: GrupoSubject[];
  className?: string;
  size?: "sm" | "md";
}) {
  if (subjects.length === 0) return null;

  const chip =
    size === "md"
      ? "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold"
      : "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold";

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {subjects.map((subject) => (
        <li key={subject.id}>
          <span className={`${chip} ${subjectChipClass(subject.color)}`}>
            <span className="truncate">{subject.name}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
