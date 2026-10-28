"use client";

import { AssessmentsPanel } from "@/components/assessments/assessments-panel";
import { MaterialsPanel } from "@/components/classroom/materials-panel";
import { SubjectBar, SubjectSwitcher } from "@/components/classroom/subject-switcher";
import type { AssessmentSummary } from "@/lib/assessments/model";
import type { ClassMaterial } from "@/lib/dashboard/materials";

/**
 * "Trabajo de clase": assessments and materials for the active subject.
 *
 * Both lists arrive **once, unfiltered** for the whole class (they are small —
 * titles, dates and counts), and the subject is applied here on the client.
 * Switching a subject therefore repaints instantly; it does not need a server
 * render, a loading skeleton, or another query. The URL still carries
 * `?subject=` so a reload or a shared link lands on the same subject.
 */
export function ClassworkPanel({
  classId,
  assessments,
  materials,
  selectedSubjectId,
  subjects,
  studentCount,
  onSubjectChange,
}: {
  classId: string;
  assessments: AssessmentSummary[];
  materials: ClassMaterial[];
  selectedSubjectId: string | null;
  subjects: { id: string; name: string }[];
  studentCount: number;
  /** Applies the subject immediately (local state) before the URL catches up. */
  onSubjectChange?: (subjectId: string) => void;
}) {
  /** Classwork is per subject: show only the active subject's items. Unassigned
   * items are not leaked into every subject. */
  function subjectMatches(itemSubjectId: string | null): boolean {
    if (!selectedSubjectId) return true;
    return itemSubjectId === selectedSubjectId;
  }

  const shownAssessments = assessments.filter((item) => subjectMatches(item.subjectId));
  const shownMaterials = materials.filter((item) => subjectMatches(item.subjectId));

  return (
    <div className="flex flex-col gap-4">
      {/* The subject is this tab's context: it filters both lists below.
          With a single subject there is nothing to choose, so the bar is not
          rendered at all and the subject appears as a label beside each list
          heading instead — saving a whole row. */}
      {subjects.length > 1 ? (
        <SubjectBar>
          <SubjectSwitcher
            classId={classId}
            tab="trabajo"
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSubjectChange={onSubjectChange}
          />
        </SubjectBar>
      ) : null}

      <div className="grid items-start gap-8 xl:grid-cols-2 xl:gap-6">
        <MaterialsPanel
          classId={classId}
          materials={shownMaterials}
          defaultSubjectId={selectedSubjectId}
          subjectLabel={subjects.length === 1 ? subjects[0].name : null}
        />
        <AssessmentsPanel
          classId={classId}
          assessments={shownAssessments}
          studentCount={studentCount}
          defaultSubjectId={selectedSubjectId}
          subjectLabel={subjects.length === 1 ? subjects[0].name : null}
          subjects={subjects}
        />
      </div>
    </div>
  );
}
