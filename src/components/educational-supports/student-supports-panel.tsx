"use client";

import { HandHeart } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { EducationalSupport } from "@/lib/educational-supports/model";

export function StudentEducationalSupportsPanel({
  supports,
}: {
  supports: EducationalSupport[];
}) {
  const t = useT();
  const copy = t.educationalSupports;

  if (supports.length === 0) return null;

  return (
    <section className="rounded-2xl border border-brand-200/70 bg-brand-50/40 px-5 py-4 dark:border-brand-900/50 dark:bg-brand-950/20">
      <div className="mb-3 flex items-center gap-2">
        <HandHeart className="h-4 w-4 text-brand-600 dark:text-brand-300" strokeWidth={2.25} />
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-800 dark:text-brand-200">
          {copy.sectionTitle}
        </h2>
      </div>
      <ul className="flex flex-col gap-3">
        {supports.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border/70 bg-surface px-4 py-3"
          >
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
              {copy.categories[item.category]}
            </span>
            <p className="mt-2 text-sm font-bold text-foreground">{item.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
              {item.description}
            </p>
            <p className="mt-2 text-xs font-medium text-foreground/45">
              {item.subjectScope === "all"
                ? copy.subjectScopeAll
                : item.subjectLabels.length === 1
                  ? copy.subjectScopeOne.replace("{subject}", item.subjectLabels[0]!)
                  : item.subjectLabels.length > 1
                    ? copy.subjectScopeMany.replace("{subjects}", item.subjectLabels.join(", "))
                    : copy.subjectScopeAll}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
