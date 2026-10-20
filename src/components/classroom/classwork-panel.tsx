"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { AssessmentsPanel } from "@/components/assessments/assessments-panel";
import { MaterialsPanel } from "@/components/classroom/materials-panel";
import type { AssessmentSummary } from "@/lib/assessments/model";
import type { ClassMaterial } from "@/lib/dashboard/materials";

/** "Trabajo de clase": assessments and materials for the active subject. */
export function ClassworkPanel({
  classId,
  assessments,
  materials,
  selectedSubjectId,
  subjects,
  studentCount,
}: {
  classId: string;
  assessments: AssessmentSummary[];
  materials: ClassMaterial[];
  selectedSubjectId: string | null;
  subjects: { id: string; name: string }[];
  studentCount: number;
}) {
  const t = useT();

  /** Classwork is per subject: show only the active subject's items. Unassigned
   * items are not leaked into every subject. */
  function subjectMatches(itemSubjectId: string | null): boolean {
    if (!selectedSubjectId) return true;
    return itemSubjectId === selectedSubjectId;
  }

  const shownAssessments = assessments.filter((item) => subjectMatches(item.subjectId));
  const shownMaterials = materials.filter((item) => subjectMatches(item.subjectId));

  return (
    <div className="flex flex-col gap-6">
      {subjects.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/40">
            {t.classroom.subjectsLabel}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {subjects.map((option) => {
              const active = option.id === selectedSubjectId;
              return (
                <Link
                  key={option.id}
                  href={`/aula-virtual/${classId}?subject=${option.id}&tab=trabajo`}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "border-[#7dd3e8] bg-[#e6f7fb] text-[#0e6b7c] dark:border-[#155e75] dark:bg-[#0f2f36] dark:text-[#7fdcea]"
                      : "border-border text-foreground/55 hover:border-foreground/20 hover:text-foreground",
                  )}
                >
                  {option.name}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-8 xl:grid-cols-2 xl:gap-6">
        <MaterialsPanel
          classId={classId}
          materials={shownMaterials}
          defaultSubjectId={selectedSubjectId}
        />
        <AssessmentsPanel
          classId={classId}
          assessments={shownAssessments}
          studentCount={studentCount}
          defaultSubjectId={selectedSubjectId}
        />
      </div>
    </div>
  );
}
