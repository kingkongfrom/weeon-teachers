import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { ClassTabs } from "@/components/classroom/class-tabs";
import { BackLink } from "@/components/layout/page-header";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassMaterials } from "@/lib/dashboard/materials";
import { loadClassAssessments } from "@/lib/dashboard/assessments";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { classBannerClass } from "@/lib/dashboard/class-banner";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Virtual classroom class page — banner + the four Classroom tabs. Novedades is
 * still an honest empty state; Trabajo de clase hosts shared documents
 * (`class_materials`).
 */
export default async function AulaVirtualClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  const detail = await loadTeacherGrupo(classId);
  if (!detail) notFound();

  const [session, materials, assessments] = await Promise.all([
    getTeacherSession(),
    loadClassMaterials(classId),
    loadClassAssessments(classId),
  ]);
  const schoolName = session ? await loadSchoolName(session.tenantId) : null;
  const t = await getT();

  const { grupo, students } = detail;
  const year = new Date().getFullYear();
  const teacherName = session?.name ?? t.classroom.teacherFallback;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLink href="/aula-virtual" label={t.classroom.back} />

      <section
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white",
          classBannerClass(grupo.subjects[0]?.color),
        )}
      >
        <h1 className="brand-page-title text-3xl font-bold sm:text-4xl">{grupo.name}</h1>
        <p className="mt-1 text-sm font-medium text-white/80">
          {schoolName ?? t.common.fallbackSchool} · {year}
        </p>
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/85">
          <Users className="h-3.5 w-3.5" />
          {t.grupos.studentsCount(grupo.studentCount)}
        </p>
      </section>

      <ClassTabs
        classId={classId}
        teacherName={teacherName}
        students={students}
        materials={materials}
        assessments={assessments}
      />
    </div>
  );
}
