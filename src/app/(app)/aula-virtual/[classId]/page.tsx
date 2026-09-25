import { notFound } from "next/navigation";
import { Presentation, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AULA_TEAL } from "@/lib/dashboard/tones";
import { ClassTabs } from "@/components/classroom/class-tabs";
import { BackLink } from "@/components/layout/page-header";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassMaterials } from "@/lib/dashboard/materials";
import { loadClassAssessments } from "@/lib/dashboard/assessments";
import { loadClassTurnIns } from "@/lib/dashboard/submissions";
import { loadClassStream } from "@/lib/dashboard/stream";
import { loadClassTopics } from "@/lib/dashboard/topics";
import { loadClassAttendance } from "@/lib/dashboard/attendance";
import { normalizeAttendanceDate } from "@/lib/attendance/model";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { getT } from "@/lib/i18n/server";

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
  searchParams: Promise<{ tab?: string; subject?: string; date?: string; lesson?: string }>;
}) {
  const { classId } = await params;
  const { tab, subject, date, lesson } = await searchParams;

  const detail = await loadTeacherGrupo(classId);
  if (!detail) notFound();

  const attendanceDate = normalizeAttendanceDate(date);
  const attendanceLessonId =
    lesson && /^[0-9a-fA-F-]{36}$/.test(lesson) ? lesson : null;

  const { grupo, students } = detail;
  const [session, materials, rawAssessments, stream, topics, attendanceMarks, turnIns] =
    await Promise.all([
      getTeacherSession(),
      loadClassMaterials(classId),
      loadClassAssessments(classId),
      loadClassStream(classId),
      loadClassTopics(classId),
      loadClassAttendance(classId, attendanceDate),
      loadClassTurnIns(classId, students),
    ]);
  const schoolName = session ? await loadSchoolName(session.tenantId) : null;
  const t = await getT();

  const assessments = rawAssessments.map((item) => {
    const stat = turnIns.get(item.id);
    return {
      ...item,
      submittedCount: stat?.submittedCount ?? 0,
      submitterNames: stat?.submitterNames ?? [],
    };
  });
  const year = new Date().getFullYear();
  const teacherName = session?.name ?? t.classroom.teacherFallback;

  const subjects = grupo.subjects;
  const selectedSubjectId =
    subject && subjects.some((option) => option.id === subject)
      ? subject
      : (subjects[0]?.id ?? null);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLink href="/aula-virtual" label={t.classroom.back} />

      <section className={cn("relative overflow-hidden rounded-3xl border border-border p-6", AULA_TEAL.card)}>
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white",
              AULA_TEAL.avatar,
            )}
            aria-hidden
          >
            <Presentation className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h1 className={cn("brand-page-title text-3xl font-bold sm:text-4xl", AULA_TEAL.label)}>{grupo.name}</h1>
            <p className="mt-1 text-sm font-medium text-foreground/55">
              {schoolName ?? t.common.fallbackSchool} · {year}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/55">
              <Users className="h-3.5 w-3.5" />
              {t.grupos.studentsCount(grupo.studentCount)}
            </p>
          </div>
        </div>
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
        attendanceDate={attendanceDate}
        attendanceLessonId={attendanceLessonId}
        attendanceMarks={Object.fromEntries(
          Object.entries(attendanceMarks).map(([studentId, mark]) => [
            studentId,
            { status: mark.status, comment: mark.comment },
          ]),
        )}
      />
    </div>
  );
}
