"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ClipboardCheck, FileText, Library, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { createAssessment } from "@/lib/teachers/assessments-actions";
import {
  type AssessmentKind,
  type AssessmentSummary,
} from "@/lib/assessments/model";
import { SubmissionStatus } from "@/components/assessments/submission-status";
import { LibraryPickerDialog } from "@/components/library/library-picker-dialog";
import { useShowMore } from "@/lib/dashboard/use-show-more";
import { ActionSheet } from "@/components/ui/action-sheet";
import { TONE_WELL } from "@/lib/dashboard/tones";

/** "Trabajo de clase" list of homeworks/exams the teacher has created. */
export function AssessmentsPanel({
  classId,
  assessments,
  studentCount,
  defaultSubjectId = null,
  subjectLabel = null,
}: {
  classId: string;
  assessments: AssessmentSummary[];
  studentCount: number;
  defaultSubjectId?: string | null;
  /** Shown beside the heading when the class has only one subject. */
  subjectLabel?: string | null;
}) {
  const t = useT();
  const a = t.assessments;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Anchors the desktop dropdown to the Crear button. */
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [creating, setCreating] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Long terms accumulate dozens of assessments; show a first page so the two
  // columns stay the same height and the tab row stays near the top.
  const more = useShowMore(assessments, 4, 4);
  const [error, setError] = useState<string | null>(null);

  async function create(kind: AssessmentKind) {
    setMenuOpen(false);
    setCreating(true);
    setError(null);
    const res = await createAssessment({
      classId,
      kind,
      subjectId: defaultSubjectId,
    });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/50">
          {a.title}
          {/* One subject means no picker above, so the subject rides here. */}
          {subjectLabel ? (
            <span className="rounded-full bg-[#e6f7fb] px-2 py-0.5 text-[10px] font-bold normal-case tracking-[0.04em] text-[#0e6b7c] dark:bg-[#0f2f36] dark:text-[#7fdcea]">
              {subjectLabel}
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          ref={createButtonRef}
          onClick={() => setMenuOpen((value) => !value)}
          disabled={creating}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="btn-ink gap-1.5 disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          )}
          {a.add}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={a.add}
        triggerRef={createButtonRef}
        items={[
          {
            id: "homework",
            label: a.addHomework,
            hint: a.createHomeworkHint,
            icon: <FileText className="h-[18px] w-[18px] sm:h-4 sm:w-4" />,
            onSelect: () => void create("homework"),
          },
          {
            id: "exam",
            label: a.addExam,
            hint: a.createExamHint,
            icon: <ClipboardCheck className="h-[18px] w-[18px] sm:h-4 sm:w-4" />,
            onSelect: () => void create("exam"),
          },
          {
            id: "library",
            label: t.library.openPicker,
            hint: t.library.openPickerHint,
            icon: <Library className="h-[18px] w-[18px] sm:h-4 sm:w-4" />,
            separated: true,
            onSelect: () => setLibraryOpen(true),
          },
        ]}
      />


      <LibraryPickerDialog
        open={libraryOpen}
        classId={classId}
        subjectId={defaultSubjectId}
        onClose={() => setLibraryOpen(false)}
      />

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

      {assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-3">
          <p className="text-xs font-medium text-foreground/50">{a.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {more.visible.map((assessment) => {
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
                      assessment.kind === "exam" ? TONE_WELL.purple : TONE_WELL.blue,
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
                            ? TONE_WELL.green
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
                    {assessment.published ? (
                      <SubmissionStatus
                        compact
                        studentCount={studentCount}
                        submittedCount={assessment.submittedCount}
                        submitterNames={assessment.submitterNames}
                      />
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {more.remaining > 0 ? (
        <button
          type="button"
          onClick={more.showMore}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border text-[13px] font-semibold text-foreground/60 transition-colors hover:border-brand-200 hover:bg-surface-muted hover:text-foreground"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {a.showMore(more.remaining)}
        </button>
      ) : null}
    </section>
  );
}
