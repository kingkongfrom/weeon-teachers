import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { ClassTabs } from "@/components/classroom/class-tabs";
import { BackLink } from "@/components/layout/page-header";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { classBannerClass } from "@/lib/dashboard/class-banner";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Virtual classroom class page — banner + the four Classroom tabs. Uses the
 * existing grupo/enrollments data; Novedades and Trabajo de clase are honest
 * empty states until the stream/materials schema lands.
 */
export default async function AulaVirtualClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  const detail = await loadTeacherGrupo(classId);
  if (!detail) notFound();

  const session = await getTeacherSession();
  const schoolName = session ? await loadSchoolName(session.tenantId) : null;

  const { grupo, students } = detail;
  const year = new Date().getFullYear();
  const teacherName = session?.name ?? "Docente";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLink href="/aula-virtual" label="Aula virtual" />

      <section
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white",
          classBannerClass(grupo.subjects[0]?.color),
        )}
      >
        <h1 className="brand-page-title text-2xl font-bold sm:text-3xl">{grupo.name}</h1>
        <p className="mt-1 text-sm font-medium text-white/80">
          {schoolName ?? "Weeon School"} · {year}
        </p>
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/85">
          <Users className="h-3.5 w-3.5" />
          {grupo.studentCount} {grupo.studentCount === 1 ? "estudiante" : "estudiantes"}
        </p>
      </section>

      <ClassTabs classId={classId} teacherName={teacherName} students={students} />
    </div>
  );
}
