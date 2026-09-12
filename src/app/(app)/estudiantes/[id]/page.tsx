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

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await loadTeacherStudentReport(id);
  if (!report) notFound();
  const t = await getT();

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/estudiantes" label={t.estudiantes.back} />
      <StudentGradesView report={report} />
    </div>
  );
}
