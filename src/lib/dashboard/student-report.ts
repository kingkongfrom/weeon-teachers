import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import {
  categoryFor,
  type AssignmentCategory,
  type AssignmentKind,
} from "@/lib/dashboard/exams";
import {
  emptyAttendanceCounts,
  normalizeAttendanceStatus,
  type AttendanceCounts,
} from "@/lib/attendance/model";

const KINDS: AssignmentKind[] = ["classwork", "homework", "exam", "quiz", "project"];

function isKind(value: unknown): value is AssignmentKind {
  return typeof value === "string" && (KINDS as string[]).includes(value);
}

type AssignmentRow = {
  id: string;
  class_id: string;
  subject_id: string | null;
  title: string;
  kind: string | null;
  category: string | null;
  points: number | null;
  due_date: string | null;
  created_at: string;
};

/** One graded (or pending) column for a student, already reduced to a percent. */
export type StudentGradeItem = {
  id: string;
  title: string;
  kind: AssignmentKind;
  category: AssignmentCategory;
  /** Raw score, or null when the column has no mark yet. */
  mark: number | null;
  maxMarks: number;
  /** 0..100 rounded, or null when ungraded. */
  pct: number | null;
  dueDate: string | null;
};

export type StudentSubjectReport = {
  /** Subject id, or null for legacy columns with no subject. */
  id: string | null;
  name: string;
  color: string | null;
  /** Mean of graded percentages in the subject. */
  average: number | null;
  gradedCount: number;
  totalCount: number;
  items: StudentGradeItem[];
};

export type StudentGroupReport = {
  classId: string;
  name: string;
  grade: string | null;
  section: string | null;
  average: number | null;
  gradedCount: number;
  totalCount: number;
  attendance: AttendanceCounts;
  subjects: StudentSubjectReport[];
};

export type StudentReport = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  grade: string | null;
  /** Mean of every graded percentage across the student's groups. */
  overall: number | null;
  gradedCount: number;
  totalCount: number;
  groups: StudentGroupReport[];
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function displayClass(row: {
  name: string | null;
  grade: string | null;
  section: string | null;
}): string {
  if (row.name?.trim()) return row.name.trim();
  return `${row.grade ?? ""}${row.section ?? ""}`.trim() || "Grupo";
}

/**
 * Full grade report for one student, limited to the classes the signed-in
 * teacher teaches (`class_lessons`). Assignments are grouped by subject and each
 * mark is reduced to a percentage using the grade's own `max_marks` (falling
 * back to the column points, then 100) — the same math as the gradebook.
 */
export const loadTeacherStudentReport = cache(
  async (studentId: string): Promise<StudentReport | null> => {
    const session = await getTeacherSession();
    if (!session) return null;

    const supabase = await createSessionClient();
    const { classIds } = await loadTeacherTeachingScope(supabase, session);
    if (classIds.length === 0) return null;

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, first_name, last_name, second_last_name, grade")
      .eq("id", studentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (studentError || !student) return null;

    const { data: enrollmentRows } = await supabase
      .from("enrollments")
      .select("class_id, classes(id, name, grade, section)")
      .eq("student_id", studentId)
      .is("dropped_at", null);

    const classes = new Map<
      string,
      { id: string; name: string; grade: string | null; section: string | null }
    >();
    for (const row of enrollmentRows ?? []) {
      if (!classIds.includes(row.class_id)) continue;
      const raw = row as {
        classes:
          | { id: string; name: string | null; grade: string | null; section: string | null }
          | Array<{
              id: string;
              name: string | null;
              grade: string | null;
              section: string | null;
            }>
          | null;
      };
      const klass = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
      if (!klass) continue;
      if (!classes.has(klass.id)) {
        classes.set(klass.id, {
          id: klass.id,
          name: displayClass(klass),
          grade: klass.grade,
          section: klass.section,
        });
      }
    }

    const report: StudentReport = {
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      secondLastName: student.second_last_name,
      grade: student.grade,
      overall: null,
      gradedCount: 0,
      totalCount: 0,
      groups: [],
    };

    const visibleClassIds = [...classes.keys()];
    if (visibleClassIds.length === 0) return null;

    const [assignmentsRes, gradesRes, attendanceRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, class_id, subject_id, title, kind, category, points, due_date, created_at")
        .in("class_id", visibleClassIds)
        .order("created_at"),
      supabase
        .from("grades")
        .select("assignment_id, mark, max_marks")
        .eq("student_id", studentId)
        .in("class_id", visibleClassIds)
        .not("assignment_id", "is", null),
      supabase
        .from("attendance_records")
        .select("class_id, status")
        .eq("student_id", studentId)
        .in("class_id", visibleClassIds),
    ]);

    const gradeByAssignment = new Map<string, { mark: number; maxMarks: number }>();
    for (const row of gradesRes.data ?? []) {
      if (!row.assignment_id) continue;
      gradeByAssignment.set(row.assignment_id, { mark: row.mark, maxMarks: row.max_marks });
    }

    const attendanceByClass = new Map<string, AttendanceCounts>();
    for (const row of attendanceRes.data ?? []) {
      const status = normalizeAttendanceStatus(row.status);
      if (!status) continue;
      const counts = attendanceByClass.get(row.class_id) ?? emptyAttendanceCounts();
      counts[status] += 1;
      attendanceByClass.set(row.class_id, counts);
    }

    const subjectIds = [
      ...new Set(
        (assignmentsRes.data ?? [])
          .map((row) => row.subject_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];
    const subjectById = new Map<string, { name: string; color: string | null }>();
    if (subjectIds.length > 0) {
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name, color")
        .in("id", subjectIds);
      for (const subject of subjects ?? []) {
        subjectById.set(subject.id, { name: subject.name, color: subject.color });
      }
    }

    const assignmentsByClass = new Map<string, AssignmentRow[]>();
    for (const row of (assignmentsRes.data ?? []) as AssignmentRow[]) {
      const list = assignmentsByClass.get(row.class_id) ?? [];
      list.push(row);
      assignmentsByClass.set(row.class_id, list);
    }

    const allPcts: number[] = [];

    report.groups = [...classes.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((klass) => {
        // Columns without a subject are untagged (legacy/never-classified) and
        // are not a real subject — they are left out of the transcript.
        const rows = (assignmentsByClass.get(klass.id) ?? []).filter(
          (row): row is AssignmentRow & { subject_id: string } => row.subject_id != null,
        );

        const bySubject = new Map<string, StudentSubjectReport>();
        const classPcts: number[] = [];

        for (const row of rows) {
          const kind = isKind(row.kind)
            ? row.kind
            : row.category === "evaluation"
              ? "exam"
              : "classwork";
          const grade = gradeByAssignment.get(row.id);
          const maxMarks = grade?.maxMarks ?? row.points ?? 100;
          const pct =
            grade && maxMarks > 0 ? Math.round((grade.mark / maxMarks) * 100) : null;

          const subject = bySubject.get(row.subject_id) ?? {
            id: row.subject_id,
            name: subjectById.get(row.subject_id)?.name ?? "",
            color: subjectById.get(row.subject_id)?.color ?? null,
            average: null,
            gradedCount: 0,
            totalCount: 0,
            items: [],
          };
          subject.items.push({
            id: row.id,
            title: row.title,
            kind,
            category: categoryFor(kind),
            mark: grade?.mark ?? null,
            maxMarks,
            pct,
            dueDate: row.due_date,
          });
          subject.totalCount += 1;
          if (pct != null) {
            subject.gradedCount += 1;
            classPcts.push(pct);
            allPcts.push(pct);
          }
          bySubject.set(row.subject_id, subject);
        }

        const subjects = [...bySubject.values()]
          .map((subject) => ({
            ...subject,
            average: mean(
              subject.items
                .map((item) => item.pct)
                .filter((value): value is number => value != null),
            ),
          }))
          .sort((a, b) => (a.name || "\uffff").localeCompare(b.name || "\uffff", "es"));

        return {
          classId: klass.id,
          name: klass.name,
          grade: klass.grade,
          section: klass.section,
          average: mean(classPcts),
          gradedCount: classPcts.length,
          totalCount: rows.length,
          attendance: attendanceByClass.get(klass.id) ?? emptyAttendanceCounts(),
          subjects,
        };
      })
      .filter((group) => group.subjects.length > 0);

    report.overall = mean(allPcts);
    report.gradedCount = allPcts.length;
    report.totalCount = report.groups.reduce((sum, group) => sum + group.totalCount, 0);

    return report;
  },
);
