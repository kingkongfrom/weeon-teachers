import { notFound } from "next/navigation";
import { Presentation, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AULA_TEAL } from "@/lib/dashboard/tones";
import { ClassTabs } from "@/components/classroom/class-tabs";
import { BackLink } from "@/components/layout/page-header";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassMaterials } from "@/lib/dashboard/materials";
import { loadClassAssessments } from "@/lib/dashboard/assessments";
import { loadClassExamDates, loadClassLessonDays } from "@/lib/dashboard/exam-dates";
import { loadClassTurnIns } from "@/lib/dashboard/submissions";
import { loadClassAttendance } from "@/lib/dashboard/attendance";
import { loadJustificationInbox } from "@/lib/dashboard/justification-inbox";
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
  const [
    session,
    materials,
    rawAssessments,
    attendanceMarks,
    turnIns,
    pendingJustifications,
    examDates,
    lessonDays,
  ] = await Promise.all([
    getTeacherSession(),
    loadClassMaterials(classId),
    loadClassAssessments(classId),
    loadClassAttendance(classId, attendanceDate),
    loadClassTurnIns(classId, students),
    loadJustificationInbox().then((rows) => rows.filter((row) => row.classId === classId).length),
    loadClassExamDates(classId),
    loadClassLessonDays(classId),
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

      {/* Tinted card that matches the subject pills; no gradient bar. */}
      <section className="relative overflow-hidden rounded-3xl border border-[#7dd3e8]/50 bg-[radial-gradient(120%_140%_at_0%_0%,#e6f7fb_0%,#f7fdff_45%,#ffffff_100%)] shadow-sm dark:border-[#155e75]/50 dark:bg-[radial-gradient(120%_140%_at_0%_0%,#0f2f36_0%,#0b1f25_55%,#0a1a1f_100%)]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 p-6">
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
              AULA_TEAL.avatar,
            )}
            aria-hidden
          >
            <Presentation className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/45">
              {t.classroom.title}
            </p>
            <h1
              className={cn(
                "brand-page-title mt-0.5 truncate text-3xl font-bold leading-tight sm:text-4xl",
                AULA_TEAL.label,
              )}
            >
              {grupo.name}
            </h1>
            <p className="mt-1 text-sm font-medium text-foreground/55">
              {schoolName ?? t.common.fallbackSchool} · {year}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-foreground/70">
              <Users className="h-4 w-4 text-foreground/45" />
              {t.grupos.studentsCount(grupo.studentCount)}
            </span>
            {subjects.length === 1 ? (
              <span className="inline-flex h-9 items-center rounded-full bg-surface-muted px-3.5 text-sm font-semibold text-foreground/70">
                {subjects[0].name}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <ClassTabs
        classId={classId}
        teacherName={teacherName}
        students={students}
        materials={materials}
        assessments={assessments}
        examDates={examDates}
        lessonDays={lessonDays}
        selectedSubjectId={selectedSubjectId}
        subjects={subjects.map((option) => ({ id: option.id, name: option.name }))}
        initialTab={tab}
        attendanceDate={attendanceDate}
        attendanceLessonId={attendanceLessonId}
        attendanceMarks={Object.fromEntries(
          Object.entries(attendanceMarks).map(([studentId, mark]) => [
            studentId,
            {
              status: mark.status,
              comment: mark.comment,
              recordId: mark.recordId,
              guardianNote: mark.guardianNote,
              guardianAttachmentUrl: mark.guardianAttachmentUrl,
              guardianAttachmentPath: mark.guardianAttachmentPath,
              guardianDecision: mark.guardianDecision,
            },
          ]),
        )}
        pendingJustifications={pendingJustifications}
      />
    </div>
  );
}
