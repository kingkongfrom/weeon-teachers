import { notFound } from "next/navigation";
import { AssessmentEditor } from "@/components/assessments/assessment-editor";
import { loadAssessment } from "@/lib/dashboard/assessments";

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

  const assessment = await loadAssessment(assessmentId);
  if (!assessment || assessment.classId !== classId) notFound();

  return <AssessmentEditor initial={assessment} />;
}
