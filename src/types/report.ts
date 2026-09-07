import type { Student } from "./student";

export type ReportStatus = "draft" | "published";

export type StudentReport = {
  id: string;
  studentId: string;
  student?: Student;
  title: string;
  content: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};
