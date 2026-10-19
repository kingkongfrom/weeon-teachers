import "server-only";

import { summarizeConduct } from "@/lib/conduct/model";
import {
  loadClassAttendanceCounts,
  loadClassAttendanceLog,
} from "@/lib/dashboard/attendance";
import { loadClassConduct } from "@/lib/dashboard/conduct";
import { loadClassExams, loadClassRubros } from "@/lib/dashboard/exams";
import {
  orderedRubros,
  studentFinal,
  type RubroColumn,
  type RubroInput,
} from "@/lib/dashboard/grade-weights";
import { schoolAcademicYear, schoolPeriodLabel } from "@/lib/dashboard/school-period";
import type {
  ReportAssignmentMeta,
  ReportAttendanceLogEntry,
  ReportAttendanceSnapshot,
  ReportConductLogEntry,
  ReportConductSnapshot,
  ReportDraft,
  ReportGradesSnapshot,
  ReportRubroMeta,
  ReportFinalsSnapshot,
  ReportSummary,
} from "@/lib/reports/model";
import { createSessionClient } from "@/lib/supabase/session";

function studentDisplayName(row: {
  first_name: string;
  last_name: string;
  second_last_name: string | null;
}): string {
  return `${row.first_name} ${row.last_name}${
    row.second_last_name ? ` ${row.second_last_name}` : ""
  }`.trim();
}

/** Server-side snapshot for preview or submit — never trust client payloads. */
export async function buildReportDraft(input: {
  classId: string;
  subjectId?: string | null;
  groupName: string;
  subjectName?: string | null;
  locale?: "es" | "en";
}): Promise<ReportDraft | { error: string }> {
  const supabase = await createSessionClient();
  const subjectId = input.subjectId ?? null;

  const [exams, rubros, conductRecords, attendanceCounts, attendanceRecords] =
    await Promise.all([
      loadClassExams(input.classId, subjectId),
      loadClassRubros(input.classId, subjectId),
      loadClassConduct(input.classId),
      loadClassAttendanceCounts(input.classId),
      loadClassAttendanceLog(input.classId),
    ]);

  if (exams.length === 0) {
    return { error: "Agregue al menos una evaluación antes de subir el reporte." };
  }

  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_name, last_name, second_last_name)")
    .eq("class_id", input.classId)
    .is("dropped_at", null);

  if (enrollError) return { error: enrollError.message };

  const studentIds: string[] = [];
  const studentNames: Record<string, string> = {};
  for (const row of enrollments ?? []) {
    const raw = row as {
      student_id: string;
      students:
        | {
            id: string;
            first_name: string;
            last_name: string;
            second_last_name: string | null;
          }
        | {
            id: string;
            first_name: string;
            last_name: string;
            second_last_name: string | null;
          }[]
        | null;
    };
    const student = Array.isArray(raw.students) ? raw.students[0] : raw.students;
    if (!student) continue;
    studentIds.push(student.id);
    studentNames[student.id] = studentDisplayName(student);
  }

  studentIds.sort((a, b) =>
    (studentNames[a] ?? a).localeCompare(studentNames[b] ?? b, "es"),
  );

  const enrolledSet = new Set(studentIds);

  const gradesSnapshot: ReportGradesSnapshot = {};
  const assignmentTitles: Record<string, string> = {};
  const assignmentsMeta: Record<string, ReportAssignmentMeta> = {};
  const rubroMeta: ReportRubroMeta = {};
  const rubricById = new Map(rubros.map((rubro) => [rubro.id, rubro]));
  for (const rubro of orderedRubros(rubros)) {
    rubroMeta[rubro.id] = {
      name: rubro.name,
      peso: rubro.peso,
      position: rubro.position,
      archived: rubro.archived,
    };
  }
  for (const exam of exams) {
    gradesSnapshot[exam.id] = Object.fromEntries(
      Object.entries(exam.grades).map(([studentId, grade]) => [
        studentId,
        { mark: grade.mark, maxMarks: grade.maxMarks },
      ]),
    );
    assignmentTitles[exam.id] = exam.title;
    // Rubro name/peso are frozen on the column too: a report must render
    // without the live `grade_rubros` table (teacher list + future admin view).
    const rubro = exam.rubroId ? rubricById.get(exam.rubroId) : undefined;
    assignmentsMeta[exam.id] = {
      title: exam.title,
      kind: exam.kind,
      category: exam.category,
      points: exam.points,
      rubroId: exam.rubroId,
      rubroName: rubro?.name ?? null,
      rubroPeso: rubro?.peso ?? null,
      rubroPosition: rubro?.position ?? null,
    };
  }

  // Weighted subject finals, using the same module as the gradebook, so the
  // report snapshot never disagrees with what the teacher saw.
  const weighted = rubros.length > 0 && exams.some((exam) => exam.rubroId);
  const finalScores: ReportFinalsSnapshot = {};
  if (weighted) {
    const rubroInputs: RubroInput[] = rubros.map((rubro) => ({
      id: rubro.id,
      name: rubro.name,
      peso: rubro.peso,
      position: rubro.position,
      archived: rubro.archived,
    }));
    const columns: RubroColumn[] = exams.map((exam) => ({
      id: exam.id,
      rubroId: exam.rubroId,
      points: exam.points,
      grades: Object.fromEntries(
        Object.entries(exam.grades).map(([studentId, grade]) => [
          studentId,
          { mark: grade.mark, maxMarks: grade.maxMarks, status: "graded" as const },
        ]),
      ),
    }));
    for (const studentId of studentIds) {
      const percent = studentFinal(rubroInputs, columns, studentId).percent;
      if (percent != null) finalScores[studentId] = Math.round(percent);
    }
  }

  const gradedIds = new Set<string>();
  for (const exam of exams) {
    for (const studentId of Object.keys(exam.grades)) {
      if (exam.grades[studentId] != null) gradedIds.add(studentId);
    }
  }

  const conductMap = summarizeConduct(conductRecords);
  const conduct: ReportConductSnapshot = {};
  for (const studentId of studentIds) {
    const summary = conductMap.get(studentId);
    if (summary) conduct[studentId] = summary;
  }

  const conductLog: ReportConductLogEntry[] = conductRecords
    .filter((row) => enrolledSet.has(row.studentId))
    .map((row) => ({
      studentId: row.studentId,
      occurredOn: row.occurredOn,
      kind: row.kind,
      category: row.category,
      description: row.description,
      points: row.points,
    }))
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

  const attendance: ReportAttendanceSnapshot = {};
  for (const studentId of studentIds) {
    const counts = attendanceCounts[studentId];
    if (counts) attendance[studentId] = counts;
  }

  const attendanceLog: ReportAttendanceLogEntry[] = attendanceRecords
    .filter((row) => enrolledSet.has(row.studentId))
    .map((row) => ({
      studentId: row.studentId,
      date: row.date,
      status: row.status,
      comment: row.comment,
    }));

  const summary: ReportSummary = {
    gradedStudents: gradedIds.size,
    totalStudents: studentIds.length,
  };

  const period = schoolPeriodLabel(new Date().toISOString(), input.locale ?? "es");
  const academicYear = schoolAcademicYear(new Date().toISOString());

  return {
    classId: input.classId,
    groupName: input.groupName,
    subjectId,
    subjectName: input.subjectName ?? null,
    period,
    academicYear,
    grades: gradesSnapshot,
    assignmentTitles,
    assignmentsMeta,
    rubros: rubroMeta,
    finals: finalScores,
    studentNames,
    studentIds,
    conduct,
    conductLog,
    attendance,
    attendanceLog,
    summary,
  };
}
