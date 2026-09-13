import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/layout/page-header";
import { StudentGradesView } from "@/components/students/student-grades-view";
import { loadTeacherStudentReport } from "@/lib/dashboard/student-report";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.student.title };
}

/**
 * Per-student transcript. There is no global students list: students live in the
 * aula virtual **Personas** tab (per group) and the gradebook rows. This route is
 * the drill-down, and `?from=` returns the teacher to where they came from.
 */
export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const report = await loadTeacherStudentReport(id);
  if (!report) notFound();
  const t = await getT();

  const backHref =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
      ? from
      : "/aula-virtual";
  const backLabel = backHref.startsWith("/grupos")
    ? t.panel.grades.label
    : t.aulaVirtual.back;

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={backHref} label={backLabel} />
      <StudentGradesView report={report} />
    </div>
  );
}
