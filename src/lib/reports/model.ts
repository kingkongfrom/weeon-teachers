import type { AttendanceCounts, AttendanceStatus } from "@/lib/attendance/model";
import type {
  ConductCategory,
  ConductKind,
  ConductStudentSummary,
} from "@/lib/conduct/model";
import type { AssignmentCategory, AssignmentKind } from "@/lib/dashboard/exams";

export type ReportGradeCell = { mark: number; maxMarks: number };

export type ReportGradesSnapshot = Record<string, Record<string, ReportGradeCell>>;

export type ReportConductSnapshot = Record<string, ConductStudentSummary>;

export type ReportAttendanceSnapshot = Record<string, AttendanceCounts>;

export type ReportConductLogEntry = {
  studentId: string;
  occurredOn: string;
  kind: ConductKind;
  category: ConductCategory;
  description: string;
  points: number;
};

export type ReportAttendanceLogEntry = {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  comment: string | null;
};

export type ReportAssignmentMeta = {
  title: string;
  kind: AssignmentKind;
  category: AssignmentCategory;
  points: number | null;
};

export type ReportSummary = {
  gradedStudents: number;
  totalStudents: number;
  teacherNotes?: string;
};

export type ReportDraft = {
  classId: string;
  groupName: string;
  subjectId: string | null;
  subjectName: string | null;
  period: string;
  grades: ReportGradesSnapshot;
  assignmentTitles: Record<string, string>;
  assignmentsMeta: Record<string, ReportAssignmentMeta>;
  studentNames: Record<string, string>;
  studentIds: string[];
  conduct: ReportConductSnapshot;
  conductLog: ReportConductLogEntry[];
  attendance: ReportAttendanceSnapshot;
  attendanceLog: ReportAttendanceLogEntry[];
  summary: ReportSummary;
};

export type SubmittedReportExtras = {
  conduct: ReportConductSnapshot;
  conductLog: ReportConductLogEntry[];
  attendance: ReportAttendanceSnapshot;
  attendanceLog: ReportAttendanceLogEntry[];
  assignmentsMeta: Record<string, ReportAssignmentMeta>;
  teacherNotes: string | null;
};
