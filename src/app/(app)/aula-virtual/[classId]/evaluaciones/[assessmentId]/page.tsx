import { notFound } from "next/navigation";
import { AssessmentEditor } from "@/components/assessments/assessment-editor";
import { loadAssessment } from "@/lib/dashboard/assessments";
import { resolveAssessmentImages } from "@/lib/assessments/images.server";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassTopics } from "@/lib/dashboard/topics";
import { loadClassTurnIns } from "@/lib/dashboard/submissions";

export const dynamic = "force-dynamic";

/**
 * Teacher assessment builder — create/edit a homework or exam with a WYSIWYG
 * (TipTap) editor, question types, preview, draft/publish. Reached from
 * `/aula-virtual/[classId]` → Trabajo de clase.
 */
export default async function AssessmentEditorPage({
  params,
}: {
  params: Promise<{ classId: string; assessmentId: string }>;
}) {
  const { classId, assessmentId } = await params;

  const [rawAssessment, detail, topics] = await Promise.all([
    loadAssessment(assessmentId),
    loadTeacherGrupo(classId),
    loadClassTopics(classId),
  ]);
  if (!rawAssessment || rawAssessment.classId !== classId) notFound();

  // Inline images: inject fresh signed URLs before handing the doc to the editor.
  const assessment = await resolveAssessmentImages(rawAssessment);

  const students = detail?.students ?? [];
  const turnIns = await loadClassTurnIns(classId, students);
  const stat = turnIns.get(assessmentId);

  return (
    <AssessmentEditor
      initial={assessment}
      subjectName={
        detail?.grupo.subjects.find((subject) => subject.id === assessment.subjectId)?.name ??
        null
      }
      topics={topics.map((topic) => ({ id: topic.id, name: topic.name }))}
      studentCount={students.length}
      submissions={stat?.submissions ?? []}
    />
  );
}
