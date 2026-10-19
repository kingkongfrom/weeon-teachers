import "server-only";

import { schoolToday } from "@/lib/attendance/model";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type ExcursionDecision = "approved" | "denied" | "pending";

export type TeacherExcursionMaterial = {
  id: string;
  fileName: string;
  url: string;
};

export type TeacherExcursionGuardian = {
  name: string;
  decision: ExcursionDecision;
};

export type TeacherExcursionStudent = {
  id: string;
  name: string;
  decision: ExcursionDecision;
  guardians: TeacherExcursionGuardian[];
};

export type TeacherExcursion = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  meetingPoint: string | null;
  cost: number | null;
  consentDeadline: string | null;
  imageUrl: string | null;
  teacherName: string;
  groupName: string | null;
  materials: TeacherExcursionMaterial[];
  students: TeacherExcursionStudent[];
};

const BUCKET = "school-excursions";

function publicObjectUrl(path: unknown): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  const encoded = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

function asDecision(value: unknown): ExcursionDecision {
  return value === "approved" || value === "denied" ? value : "pending";
}

function asMaterials(value: unknown): TeacherExcursionMaterial[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const materials: TeacherExcursionMaterial[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const fileName = typeof row.file_name === "string" ? row.file_name : "";
    const url = publicObjectUrl(row.storage_path);
    if (!id || !fileName || !url) continue;
    materials.push({ id, fileName, url });
  }
  return materials;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Published trips this docente is responsible for, with the student rollup. */
export async function loadResponsibleExcursions(): Promise<
  { ok: true; trips: TeacherExcursion[] } | { ok: false }
> {
  const supabase = await createSessionClient();
  const session = await getTeacherSession();
  const { data, error } = await supabase.rpc("list_my_excursions", {
    p_student_id: null,
    p_include_past: true,
  });
  if (error || !Array.isArray(data)) return { ok: false };

  const mine = data
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => row?.responsible === true);
  const teacherName = session?.name?.trim() || "Docente";

  const trips = await Promise.all(
    mine.map(async (row) => {
      const id = typeof row.id === "string" ? row.id : "";
      const students = id ? await loadRoster(supabase, id) : [];
      return {
        id,
        title: typeof row.title === "string" ? row.title : "",
        description: typeof row.description === "string" ? row.description : null,
        date: typeof row.event_date === "string" ? row.event_date : "",
        endDate: typeof row.end_date === "string" ? row.end_date : null,
        allDay: row.all_day !== false,
        startTime: typeof row.start_time === "string" ? row.start_time : null,
        endTime: typeof row.end_time === "string" ? row.end_time : null,
        location: textOrNull(row.location),
        meetingPoint: textOrNull(row.meeting_point),
        cost: asCost(row.cost),
        consentDeadline: textOrNull(row.consent_deadline),
        imageUrl: publicObjectUrl(row.image_storage_path),
        teacherName,
        groupName: textOrNull(row.group_name),
        materials: asMaterials(row.materials),
        students,
      } satisfies TeacherExcursion;
    }),
  );

  return { ok: true, trips: trips.filter((trip) => trip.id) };
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asCost(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function loadRoster(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  excursionId: string,
): Promise<TeacherExcursionStudent[]> {
  const { data, error } = await supabase.rpc("list_my_excursion_roster", {
    p_excursion_id: excursionId,
  });
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const row = asRecord(item);
    if (!row || typeof row.student_id !== "string") return [];
    const name = typeof row.student_name === "string" ? row.student_name.trim() : "";
    return [
      {
        id: row.student_id,
        name: name || "Estudiante",
        decision: asDecision(row.decision),
        guardians: asGuardians(row.guardians),
      },
    ];
  });
}

function asGuardians(value: unknown): TeacherExcursionGuardian[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const guardians: TeacherExcursionGuardian[] = [];
  for (const item of parsed) {
    const row = asRecord(item);
    if (!row) continue;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    guardians.push({ name, decision: asDecision(row.decision) });
  }
  return guardians;
}

export function isPastExcursion(trip: Pick<TeacherExcursion, "date" | "endDate">, today = schoolToday()): boolean {
  const end = trip.endDate && trip.endDate > trip.date ? trip.endDate : trip.date;
  return end < today;
}
