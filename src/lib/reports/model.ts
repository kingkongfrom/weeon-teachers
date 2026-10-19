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
  /** Weighted rubro the column belongs to (absent on legacy snapshots). */
  rubroId?: string | null;
  /** Rubro name frozen at submit time, so reports never need the live table. */
  rubroName?: string | null;
  /** Rubro peso frozen at submit time (0–100). */
  rubroPeso?: number | null;
  /** Rubro display order frozen at submit time. */
  rubroPosition?: number | null;
};

/** Rubro snapshot taken at submit time (peso + order), keyed by rubro id. */
export type ReportRubroMeta = Record<
  string,
  {
    name: string;
    peso: number;
    position: number;
    archived: boolean;
    /** Class average of this rubro captured at submit, when available. */
    average?: number | null;
  }
>;

/** Weighted subject final per student (whole %), when graded with rubros. */
export type ReportFinalsSnapshot = Record<string, number>;

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
  academicYear: string;
  grades: ReportGradesSnapshot;
  assignmentTitles: Record<string, string>;
  assignmentsMeta: Record<string, ReportAssignmentMeta>;
  rubros: ReportRubroMeta;
  finals: ReportFinalsSnapshot;
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
  rubros?: ReportRubroMeta;
  finals?: ReportFinalsSnapshot;
  teacherNotes: string | null;
};
