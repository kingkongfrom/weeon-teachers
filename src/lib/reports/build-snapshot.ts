import "server-only";

import { summarizeConduct } from "@/lib/conduct/model";
import {
  loadClassAttendanceCounts,
  loadClassAttendanceLog,
} from "@/lib/dashboard/attendance";
import { loadClassConduct } from "@/lib/dashboard/conduct";
import { loadClassExams } from "@/lib/dashboard/exams";
import { schoolPeriodLabel } from "@/lib/dashboard/school-period";
import type {
  ReportAssignmentMeta,
  ReportAttendanceLogEntry,
  ReportAttendanceSnapshot,
  ReportConductLogEntry,
  ReportConductSnapshot,
  ReportDraft,
  ReportGradesSnapshot,
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

  const [exams, conductRecords, attendanceCounts, attendanceRecords] = await Promise.all([
    loadClassExams(input.classId, subjectId),
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
  for (const exam of exams) {
    gradesSnapshot[exam.id] = Object.fromEntries(
      Object.entries(exam.grades).map(([studentId, grade]) => [
        studentId,
        { mark: grade.mark, maxMarks: grade.maxMarks },
      ]),
    );
    assignmentTitles[exam.id] = exam.title;
    assignmentsMeta[exam.id] = {
      title: exam.title,
      kind: exam.kind,
      category: exam.category,
      points: exam.points,
    };
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

  return {
    classId: input.classId,
    groupName: input.groupName,
    subjectId,
    subjectName: input.subjectName ?? null,
    period,
    grades: gradesSnapshot,
    assignmentTitles,
    assignmentsMeta,
    studentNames,
    studentIds,
    conduct,
    conductLog,
    attendance,
    attendanceLog,
    summary,
  };
}
