import "server-only";

import { cache } from "react";
import type { TeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import { cleanGuardianDisplayName } from "@/lib/messages/chat-display";
import type { ChatContact } from "@/lib/messages/chat-model";

export type GuardianStudentContext = {
  classLabel: string;
  studentName: string;
};

type GuardianJson = {
  id?: string;
  firstName?: string;
  lastName?: string;
};

type EnrollmentRow = {
  class_id: string;
  student_id: string;
  students:
    | {
        first_name: string | null;
        last_name: string | null;
        guardians: unknown;
      }
    | {
        first_name: string | null;
        last_name: string | null;
        guardians: unknown;
      }[]
    | null;
};

function classLabelFromRow(row: {
  name: string | null;
  grade: string | null;
  section: string | null;
}): string {
  if (row.name?.trim()) return row.name.trim();
  return `${row.grade ?? ""}${row.section ?? ""}`.trim();
}

function studentDisplayName(row: {
  first_name: string | null;
  last_name: string | null;
}): string {
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
}

function guardianNameFromJson(guardian: GuardianJson): string {
  const first = guardian.firstName?.trim() ?? "";
  const last = guardian.lastName?.trim() ?? "";
  if (!first || first === "Encargado/a" || first === "Pendiente") {
    return cleanGuardianDisplayName(last);
  }
  return cleanGuardianDisplayName(`${first} ${last}`.trim());
}

function contextMapKey(recipientKey: string, classToken: string): string {
  return `${recipientKey}::${classToken}`;
}

function contactDedupeKey(contact: ChatContact): string {
  return `${contact.key}::${contact.context}`;
}

function putContext(
  map: Map<string, GuardianStudentContext>,
  recipientKey: string,
  classLabel: string,
  classId: string,
  ctx: GuardianStudentContext,
): void {
  if (classLabel) map.set(contextMapKey(recipientKey, classLabel), ctx);
  map.set(contextMapKey(recipientKey, classId), ctx);
}

type GuardianDirectory = {
  map: Map<string, GuardianStudentContext>;
  contacts: ChatContact[];
};

/** Guardians with an enrolled child in the teacher's classes — authoritative chat picker source. */
export const loadGuardianChatDirectory = cache(
  async (session: TeacherSession): Promise<GuardianDirectory> => {
    const supabase = await createSessionClient();
    const map = new Map<string, GuardianStudentContext>();
    const contacts: ChatContact[] = [];
    const seenContacts = new Set<string>();

    const { classIds } = await loadTeacherTeachingScope(supabase, session);
    if (classIds.length === 0) return { map, contacts };

    const [classesRes, enrollmentsRes] = await Promise.all([
      supabase.from("classes").select("id, name, grade, section").in("id", classIds),
      supabase
        .from("enrollments")
        .select("class_id, student_id, students(first_name, last_name, guardians)")
        .in("class_id", classIds)
        .is("dropped_at", null),
    ]);

    const classById = new Map<
      string,
      { name: string | null; grade: string | null; section: string | null }
    >();
    for (const row of classesRes.data ?? []) {
      classById.set(row.id as string, {
        name: row.name as string | null,
        grade: row.grade as string | null,
        section: row.section as string | null,
      });
    }

    const enrollmentRows = (enrollmentsRes.data ?? []) as EnrollmentRow[];
    const studentIds = [...new Set(enrollmentRows.map((row) => row.student_id))];

    const guardianSourceIds = new Set<string>();
    for (const row of enrollmentRows) {
      const student = Array.isArray(row.students) ? row.students[0] : row.students;
      if (!student) continue;
      const guardians = Array.isArray(student.guardians) ? student.guardians : [];
      for (const guardian of guardians) {
        if (!guardian || typeof guardian !== "object") continue;
        const id = (guardian as GuardianJson).id;
        if (typeof id === "string" && id.trim()) guardianSourceIds.add(id.trim());
      }
    }

    const [rosterRes, linksRes, profilesRes] = await Promise.all([
      guardianSourceIds.size > 0
        ? supabase
            .from("roster_accounts")
            .select("id, source_id")
            .eq("source_kind", "guardian")
            .in("source_id", [...guardianSourceIds])
        : Promise.resolve({ data: [] as Array<{ id: string; source_id: string }> }),
      studentIds.length > 0
        ? supabase
            .from("parent_student_links")
            .select("parent_profile_id, student_id")
            .in("student_id", studentIds)
        : Promise.resolve({ data: [] as Array<{ parent_profile_id: string; student_id: string }> }),
      Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
    ]);

    const parentProfileIds = [
      ...new Set((linksRes.data ?? []).map((row) => row.parent_profile_id as string)),
    ];
    const profiles =
      parentProfileIds.length > 0
        ? await supabase.from("profiles").select("id, name").in("id", parentProfileIds)
        : profilesRes;

    const profileNameById = new Map<string, string>();
    for (const row of profiles.data ?? []) {
      if (row.id && row.name?.trim()) profileNameById.set(row.id as string, row.name.trim());
    }

    const rosterBySourceId = new Map<string, string>();
    for (const row of rosterRes.data ?? []) {
      if (typeof row.source_id === "string" && row.id) {
        rosterBySourceId.set(row.source_id, row.id as string);
      }
    }

    const addContact = (contact: ChatContact): void => {
      if (!contact.studentName.trim()) return;
      const dedupe = contactDedupeKey(contact);
      if (seenContacts.has(dedupe)) return;
      seenContacts.add(dedupe);
      contacts.push(contact);
      putContext(
        map,
        contact.key,
        contact.context,
        contact.classId ?? contact.context,
        { classLabel: contact.context, studentName: contact.studentName },
      );
    };

    for (const row of enrollmentRows) {
      const student = Array.isArray(row.students) ? row.students[0] : row.students;
      if (!student) continue;
      const classRow = classById.get(row.class_id);
      if (!classRow) continue;

      const classLabel = classLabelFromRow(classRow);
      const studentName = studentDisplayName(student);
      if (!studentName || !classLabel) continue;

      const ctx: GuardianStudentContext = { classLabel, studentName };
      const guardians = Array.isArray(student.guardians) ? student.guardians : [];

      for (const guardian of guardians) {
        if (!guardian || typeof guardian !== "object") continue;
        const sourceId = (guardian as GuardianJson).id;
        if (typeof sourceId !== "string" || !sourceId.trim()) continue;

        const rosterId = rosterBySourceId.get(sourceId.trim());
        putContext(map, sourceId.trim(), classLabel, row.class_id, ctx);
        if (!rosterId) continue;

        putContext(map, rosterId, classLabel, row.class_id, ctx);
        addContact({
          key: rosterId,
          name: guardianNameFromJson(guardian as GuardianJson),
          context: classLabel,
          studentName,
          classId: row.class_id,
        });
      }
    }

    const enrollmentsByStudent = new Map<string, EnrollmentRow[]>();
    for (const row of enrollmentRows) {
      const bucket = enrollmentsByStudent.get(row.student_id) ?? [];
      bucket.push(row);
      enrollmentsByStudent.set(row.student_id, bucket);
    }

    for (const link of linksRes.data ?? []) {
      const parentProfileId = link.parent_profile_id as string;
      const studentId = link.student_id as string;
      for (const row of enrollmentsByStudent.get(studentId) ?? []) {
        const classRow = classById.get(row.class_id);
        if (!classRow) continue;
        const classLabel = classLabelFromRow(classRow);
        const student = Array.isArray(row.students) ? row.students[0] : row.students;
        if (!student) continue;
        const studentName = studentDisplayName(student);
        if (!studentName || !classLabel) continue;

        const ctx: GuardianStudentContext = { classLabel, studentName };
        putContext(map, parentProfileId, classLabel, row.class_id, ctx);
        addContact({
          key: parentProfileId,
          name: cleanGuardianDisplayName(profileNameById.get(parentProfileId) ?? "Encargado"),
          context: classLabel,
          studentName,
          classId: row.class_id,
        });
      }
    }

    contacts.sort((a, b) => {
      const byClass = a.context.localeCompare(b.context, "es");
      if (byClass !== 0) return byClass;
      return a.name.localeCompare(b.name, "es");
    });

    return { map, contacts };
  },
);

/** @deprecated Use loadGuardianChatDirectory — kept for conversation enrichment. */
export const loadGuardianStudentContextMap = cache(async (session: TeacherSession) => {
  const { map } = await loadGuardianChatDirectory(session);
  return map;
});

export function lookupGuardianStudentContext(
  map: Map<string, GuardianStudentContext>,
  recipientKey: string,
  classLabel?: string | null,
  classId?: string | null,
): GuardianStudentContext | undefined {
  const label = classLabel?.trim();
  if (classId) {
    const byId = map.get(contextMapKey(recipientKey, classId));
    if (byId) return byId;
  }
  if (label) {
    const byLabel = map.get(contextMapKey(recipientKey, label));
    if (byLabel) return byLabel;
  }
  for (const [key, value] of map) {
    if (key.startsWith(`${recipientKey}::`)) return value;
  }
  return undefined;
}
