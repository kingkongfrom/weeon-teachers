import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

/**
 * Ficha médica as a teacher sees it: **read-only**, and only for a student in a
 * group they teach. Visibility is enforced by `can_read_student_medical()` in
 * the database (`get_student_medical` raises `forbidden` otherwise), so this
 * loader never widens scope — it just maps the RPC.
 *
 * The student and parent apps have no access to this data by design.
 */

export type StudentMedication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  notes: string | null;
  active: boolean;
};

export type StudentMedicalInfo = {
  allergies: string | null;
  conditions: string | null;
  notes: string | null;
  updatedAt: string | null;
  medications: StudentMedication[];
};

function toMedicalInfo(raw: unknown): StudentMedicalInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const meds = Array.isArray(row.medications) ? row.medications : [];
  const info: StudentMedicalInfo = {
    allergies: typeof row.allergies === "string" ? row.allergies : null,
    conditions: typeof row.conditions === "string" ? row.conditions : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    medications: meds.map((item) => {
      const med = item as Record<string, unknown>;
      return {
        id: String(med.id ?? ""),
        name: String(med.name ?? ""),
        dose: String(med.dose ?? ""),
        frequency: String(med.frequency ?? ""),
        notes: typeof med.notes === "string" ? med.notes : null,
        active: med.active !== false,
      };
    }),
  };
  const empty =
    !info.allergies && !info.conditions && !info.notes && info.medications.length === 0;
  return empty ? null : info;
}

export const loadStudentMedicalInfo = cache(
  async (studentId: string): Promise<StudentMedicalInfo | null> => {
    const session = await getTeacherSession();
    if (!session) return null;

    const supabase = await createSessionClient();
    const { data, error } = await supabase.rpc("get_student_medical", {
      p_student_id: studentId,
    });
    // `forbidden` / not a teacher of this student: show nothing, never fail.
    if (error || !data) return null;
    return toMedicalInfo(data);
  },
);
