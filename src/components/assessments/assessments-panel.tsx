"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ClipboardCheck, FileText, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { createAssessment } from "@/lib/teachers/assessments-actions";
import {
  type AssessmentKind,
  type AssessmentSummary,
} from "@/lib/assessments/model";

/** "Trabajo de clase" list of homeworks/exams the teacher has created. */
export function AssessmentsPanel({
  classId,
  assessments,
}: {
  classId: string;
  assessments: AssessmentSummary[];
}) {
  const t = useT();
  const a = t.assessments;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(kind: AssessmentKind) {
    setMenuOpen(false);
    setCreating(true);
    setError(null);
    const res = await createAssessment({ classId, kind });
    setCreating(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!res.id) {
      setError(a.errors.generic);
      return;
    }
    router.push(`/aula-virtual/${classId}/evaluaciones/${res.id}`);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
          {a.title}
        </h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-105 disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
            {a.add}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => void create("homework")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <FileText className="h-4 w-4" />
                {a.addHomework}
              </button>
              <button
                type="button"
                onClick={() => void create("exam")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <ClipboardCheck className="h-4 w-4" />
                {a.addExam}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

      {assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-3">
          <p className="text-xs font-medium text-foreground/50">{a.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {assessments.map((assessment) => {
            const Icon = assessment.kind === "exam" ? ClipboardCheck : FileText;
            return (
              <li key={assessment.id}>
                <Link
                  href={`/aula-virtual/${classId}/evaluaciones/${assessment.id}`}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      assessment.kind === "exam"
                        ? "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"
                        : "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {assessment.title || a.untitled}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          assessment.published
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-surface-muted text-foreground/50",
                        )}
                      >
                        {assessment.published ? a.published : a.draft}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-foreground/45">
                      {a.questionCount(assessment.questionCount)} ·{" "}
                      {a.pointsTotal(assessment.pointsTotal)}
                      {assessment.dueAt
                        ? ` · ${a.dueDate}: ${new Date(assessment.dueAt).toLocaleDateString("es-CR")}`
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
