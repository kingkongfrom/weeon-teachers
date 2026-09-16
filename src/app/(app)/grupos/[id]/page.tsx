import { notFound } from "next/navigation";
import { GradebookWorkspace } from "@/components/grades/gradebook-workspace";
import { ConductWorkspace } from "@/components/grades/conduct-workspace";
import { AttendanceGroupWorkspace } from "@/components/grades/tardias-workspace";
import { GrupoSectionTabs } from "@/components/grades/grupo-section-tabs";
import { BackLink } from "@/components/layout/page-header";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassExams } from "@/lib/dashboard/exams";
import { loadClassAttendanceCounts, loadClassTardias } from "@/lib/dashboard/attendance";
import { loadGradebookContext } from "@/lib/dashboard/gradebook";
import { loadClassConduct } from "@/lib/dashboard/conduct";
import { loadClassEducationalSupportFlags } from "@/lib/dashboard/educational-supports";
import { getT, getLocale } from "@/lib/i18n/server";

export default async function GrupoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subject?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { subject, tab } = await searchParams;
  const section =
    tab === "conducta"
      ? "conduct"
      : tab === "asistencia" || tab === "tardias"
        ? "attendance"
        : "grades";

  const detail = await loadTeacherGrupo(id);
  if (!detail) notFound();

  const ctx = await loadGradebookContext();
  const currentClass = ctx.classes.find((c) => c.id === id);

  const subjects = currentClass?.subjects ?? [];
  let selectedSubject: string | null = null;
  if (subject == null) {
    selectedSubject = subjects[0]?.id ?? null;
  } else if (subject === "__legacy") {
    selectedSubject = null;
  } else if (subjects.some((s) => s.id === subject)) {
    selectedSubject = subject;
  } else {
    selectedSubject = subjects[0]?.id ?? null;
  }

  const [exams, attendance, tardias, conduct, supportFlags, t, locale] = await Promise.all([
    section === "grades" ? loadClassExams(id, selectedSubject) : Promise.resolve([]),
    section === "grades" ? loadClassAttendanceCounts(id) : Promise.resolve({}),
    section === "attendance" ? loadClassTardias(id) : Promise.resolve([]),
    section === "conduct" ? loadClassConduct(id) : Promise.resolve([]),
    loadClassEducationalSupportFlags(id),
    getT(),
    getLocale(),
  ]);

  const subjectQuery =
    subject ?? (selectedSubject != null ? selectedSubject : undefined);

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/grupos" label={t.grupos.back} />

      <GrupoSectionTabs
        classId={id}
        active={section}
        subjectQuery={subjectQuery}
      />

      {section === "conduct" ? (
        <ConductWorkspace
          classId={id}
          groupName={detail.grupo.name}
          students={detail.students}
          initialRecords={conduct}
          locale={locale}
          supportFlags={supportFlags}
        />
      ) : section === "attendance" ? (
        <AttendanceGroupWorkspace
          classId={id}
          groupName={detail.grupo.name}
          students={detail.students}
          initialRecords={tardias}
          locale={locale}
        />
      ) : (
        <GradebookWorkspace
          classId={id}
          groupName={detail.grupo.name}
          students={detail.students}
          classContext={
            currentClass ?? {
              id,
              name: detail.grupo.name,
              grade: detail.grupo.grade,
              section: detail.grupo.section,
              subjects: [],
              hasLegacyExams: false,
            }
          }
          initialSubjectId={selectedSubject}
          initialExams={exams}
          attendance={attendance}
          supportFlags={supportFlags}
        />
      )}
    </div>
  );
}
