"use server";

import { z } from "zod";
import { loadStudentList } from "@/lib/dashboard/students";
import type { StudentGroupScore } from "@/lib/dashboard/student-summary";

const schema = z.object({
  limit: z.number().int().positive().max(500),
  offset: z.number().int().min(0),
});

export type StudentsPageResult = {
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    grade: string | null;
    groups: StudentGroupScore[];
  }>;
  total: number;
};

/** Loads the next page of students (server action) for the "load more" button. */
export async function loadMoreStudents(input: {
  limit: number;
  offset: number;
}): Promise<StudentsPageResult> {
  const parsed = schema.parse(input);
  return loadStudentList({ limit: parsed.limit, offset: parsed.offset });
}
