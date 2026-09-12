import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { ClassTabs } from "@/components/classroom/class-tabs";
import { BackLink } from "@/components/layout/page-header";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassMaterials } from "@/lib/dashboard/materials";
import { loadClassAssessments } from "@/lib/dashboard/assessments";
import { loadClassStream } from "@/lib/dashboard/stream";
import { loadClassTopics } from "@/lib/dashboard/topics";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { CLASS_BANNER, CLASS_BANNER_BADGE } from "@/lib/dashboard/class-banner";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Virtual classroom class page. The subject badges below the banner switch the
 * active subject; the banner shows the current one and Trabajo de clase is
 * filtered to it, so documents and work stay separated per subject.
 */
export default async function AulaVirtualClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ tab?: string; subject?: string }>;
}) {
  const { classId } = await params;
  const { tab, subject } = await searchParams;

  const detail = await loadTeacherGrupo(classId);
  if (!detail) notFound();

  const [session, materials, assessments, stream, topics] = await Promise.all([
    getTeacherSession(),
    loadClassMaterials(classId),
    loadClassAssessments(classId),
    loadClassStream(classId),
    loadClassTopics(classId),
  ]);
  const schoolName = session ? await loadSchoolName(session.tenantId) : null;
  const t = await getT();

  const { grupo, students } = detail;
  const year = new Date().getFullYear();
  const teacherName = session?.name ?? t.classroom.teacherFallback;

  const subjects = grupo.subjects;
  const selectedSubjectId =
    subject && subjects.some((option) => option.id === subject)
      ? subject
      : (subjects[0]?.id ?? null);
  const selectedSubject =
    subjects.find((option) => option.id === selectedSubjectId) ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLink href="/aula-virtual" label={t.classroom.back} />

      <section
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6",
          CLASS_BANNER,
        )}
      >
        <h1 className="brand-page-title text-3xl font-bold sm:text-4xl">{grupo.name}</h1>
        <p className="mt-1 text-sm font-medium opacity-70">
          {schoolName ?? t.common.fallbackSchool} · {year}
        </p>
        {selectedSubject ? (
          <span
            className={cn(
              "mt-3 inline-flex max-w-full items-center rounded-full border px-3 py-1 text-sm font-semibold",
              CLASS_BANNER_BADGE,
            )}
          >
            <span className="truncate">{selectedSubject.name}</span>
          </span>
        ) : null}
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold opacity-75">
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
        stream={stream}
        topics={topics}
        selectedSubjectId={selectedSubjectId}
        subjects={subjects.map((option) => ({ id: option.id, name: option.name }))}
        initialTab={tab}
      />
    </div>
  );
}
