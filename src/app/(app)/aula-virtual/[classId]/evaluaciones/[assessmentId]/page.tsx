import { notFound } from "next/navigation";
import { AssessmentEditor } from "@/components/assessments/assessment-editor";
import { loadAssessment } from "@/lib/dashboard/assessments";
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

  const [assessment, detail, topics] = await Promise.all([
    loadAssessment(assessmentId),
    loadTeacherGrupo(classId),
    loadClassTopics(classId),
  ]);
  if (!assessment || assessment.classId !== classId) notFound();

  const students = detail?.students ?? [];
  const turnIns = await loadClassTurnIns(classId, students);
  const stat = turnIns.get(assessmentId);

  return (
    <AssessmentEditor
      initial={assessment}
      subjects={(detail?.grupo.subjects ?? []).map((subject) => ({
        id: subject.id,
        name: subject.name,
      }))}
      topics={topics.map((topic) => ({ id: topic.id, name: topic.name }))}
      studentCount={students.length}
      submissions={stat?.submissions ?? []}
    />
  );
}
