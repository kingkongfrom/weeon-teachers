import "server-only";

import { cache } from "react";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";

/** Teacher-assigned classes mapped for the Comunicación recipient picker. */
export const loadCommsGroups = cache(async (): Promise<CommsGroupWithGrade[]> => {
  const grupos = await loadTeacherGrupos();
  return grupos.map((grupo) => ({
    id: grupo.id,
    name: grupo.name,
    grade: grupo.grade ?? "",
    studentCount: grupo.studentCount,
    parentCount: grupo.parentCount,
    teacherCount: 0,
  }));
});
