import { notFound } from "next/navigation";
import { SubmissionGrader } from "@/components/assessments/submission-grader";
import { loadAssessment } from "@/lib/dashboard/assessments";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadAssessmentSubmission } from "@/lib/dashboard/submissions";

export const dynamic = "force-dynamic";

/**
 * Teacher grader — the student's answers for one submitted assessment with
 * per-question scoring and feedback. Saving writes `grades` (the linked grade
 * column) and returns the work, so the transcript and gradebook update.
 */
export default async function AssessmentSubmissionPage({
  params,
}: {
  params: Promise<{ classId: string; assessmentId: string; submissionId: string }>;
}) {
  const { classId, assessmentId, submissionId } = await params;

  const [assessment, detail, submission] = await Promise.all([
    loadAssessment(assessmentId),
    loadTeacherGrupo(classId),
    loadAssessmentSubmission(assessmentId, submissionId),
  ]);
  if (!assessment || assessment.classId !== classId || !detail || !submission) notFound();

  const student = detail.students.find((item) => item.id === submission.studentId);
  const studentName = student
    ? `${student.lastName} ${student.firstName}`.trim()
    : "Estudiante";

  return (
    <SubmissionGrader
      classId={classId}
      assessment={assessment}
      submission={submission}
      studentName={studentName}
      groupName={detail.grupo.name}
    />
  );
}
