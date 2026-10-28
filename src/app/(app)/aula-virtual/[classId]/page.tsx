import { notFound } from "next/navigation";
import { ClassTabs } from "@/components/classroom/class-tabs";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassMaterials } from "@/lib/dashboard/materials";
import { loadClassAssessments } from "@/lib/dashboard/assessments";
import { loadClassExamDates, loadClassLessonDays } from "@/lib/dashboard/exam-dates";
import { loadClassTurnIns } from "@/lib/dashboard/submissions";
import { loadClassAttendance, type AttendanceMark } from "@/lib/dashboard/attendance";
import { loadJustificationCountForClass } from "@/lib/dashboard/justification-inbox";
import { normalizeAttendanceDate } from "@/lib/attendance/model";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Virtual classroom class page. The subject badges below the banner switch the
 * active subject; the banner shows the current one and Trabajo de clase is
 * filtered to it, so documents and work stay separate per subject.
 *
 * **What each request loads is decided by the tab.** Every subject pill, tab
 * and class navigation lands here, and it used to run every loader — materials,
 * assessments, submissions, attendance, exam dates, timetable periods and the
 * whole school-wide justification inbox — before painting anything. Now only
 * the active tab's data is fetched, in one parallel round; a subject switch is
 * just the classwork pair again.
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

  const [detail, session] = await Promise.all([loadTeacherGrupo(classId), getTeacherSession()]);
  if (!detail) notFound();

  const attendanceDate = normalizeAttendanceDate(date);
  const attendanceLessonId =
    lesson && /^[0-9a-fA-F-]{36}$/.test(lesson) ? lesson : null;

  const { grupo, students } = detail;
  const worksOnClasswork =
    tab !== "examenes" && tab !== "personas" && tab !== "asistencia" && tab !== "calificaciones";
  const worksOnExams = tab === "examenes";
  const worksOnAttendance = tab === "asistencia";

  // Every entry is an awaited promise of its own type: a union of
  // `Promise<A> | Promise<B>` collapses to `Promise<A | B>` and the tuple
  // below stops checking, so a tab that loads nothing must still resolve to an
  // *empty* value of the right type (`[]`, `new Map()`), never `undefined`.
  const [materials, rawAssessments, turnIns, attendanceMarks, examDates, lessonDays, pendingJustifications, schoolName] =
    await Promise.all([
      worksOnClasswork
        ? loadClassMaterials(classId)
        : Promise.resolve([] as Awaited<ReturnType<typeof loadClassMaterials>>),
      worksOnClasswork
        ? loadClassAssessments(classId)
        : Promise.resolve([] as Awaited<ReturnType<typeof loadClassAssessments>>),
      worksOnClasswork
        ? loadClassTurnIns(classId, students)
        : Promise.resolve(new Map() as Awaited<ReturnType<typeof loadClassTurnIns>>),
      worksOnAttendance
        ? loadClassAttendance(classId, attendanceDate)
        : Promise.resolve({} as Record<string, AttendanceMark>),
      worksOnExams
        ? loadClassExamDates(classId)
        : Promise.resolve([] as Awaited<ReturnType<typeof loadClassExamDates>>),
      worksOnExams
        ? loadClassLessonDays(classId)
        : Promise.resolve([] as Awaited<ReturnType<typeof loadClassLessonDays>>),
      // Only a badge, so ask for a count scoped to this group instead of
      // loading (and signing attachments for) the teacher's whole inbox.
      worksOnAttendance ? loadJustificationCountForClass(classId) : Promise.resolve(0),
      session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
    ]);
  const t = await getT();

  const assessments = (Array.isArray(rawAssessments) ? rawAssessments : []).map((item) => {
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
      {/*
       * The class identity, its tabs and the subject switch all live in one
       * command header inside ClassTabs. What used to be here — a back link, a
       * 220 px hero card repeating "Aula virtual", and a separate tab row — put
       * three bands of chrome above the work and named the section three times.
       * The class name is the title once, and everything is reachable in the
       * first 56 px of the page.
       */}
      <ClassTabs
        classId={classId}
        className={grupo.name}
        schoolName={schoolName}
        year={year}

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
