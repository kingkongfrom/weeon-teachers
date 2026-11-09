import "server-only";

import { cache } from "react";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadGradebookContext } from "@/lib/dashboard/gradebook";
import { buildReportDraft } from "@/lib/reports/build-snapshot";
import type { ReportDraft } from "@/lib/reports/model";
import { getLocale } from "@/lib/i18n/server";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type ReportComposerContext =
  | { ok: true; draft: ReportDraft; backHref: string }
  | { ok: false; backHref: string; groupName: string; error: string };

/** Loads everything the report composer page needs for preview + submit. */
export const loadReportComposer = cache(
  async (
    classId: string,
    subjectParam?: string,
  ): Promise<ReportComposerContext | null> => {
    const detail = await loadTeacherGrupo(classId);
    if (!detail) return null;

    const ctx = await loadGradebookContext();
    const currentClass = ctx.classes.find((c) => c.id === classId);
    const subjects = currentClass?.subjects ?? [];

    let selectedSubject: string | null = null;
    if (subjectParam == null) {
      selectedSubject = subjects[0]?.id ?? null;
    } else if (subjectParam === "__legacy") {
      selectedSubject = null;
    } else if (subjects.some((s) => s.id === subjectParam)) {
      selectedSubject = subjectParam;
    } else {
      selectedSubject = subjects[0]?.id ?? null;
    }

    const subjectName =
      selectedSubject != null
        ? (subjects.find((s) => s.id === selectedSubject)?.name ?? null)
        : null;

    const locale = await getLocale();
    const built = await buildReportDraft({
      classId,
      subjectId: selectedSubject,
      groupName: detail.grupo.name,
      subjectName,
      locale,
    });

    const subjectQuery =
      subjectParam ??
      (selectedSubject != null ? selectedSubject : subjects.length === 0 ? undefined : "__legacy");
    const backHref =
      subjectQuery != null
        ? `/grupos/${classId}?subject=${encodeURIComponent(subjectQuery)}`
        : `/grupos/${classId}`;

    if ("error" in built) {
      return { ok: false, backHref, groupName: detail.grupo.name, error: built.error };
    }

    return { ok: true, draft: built, backHref };
  },
);

/**
 * The per-student observations already saved for this report, keyed by student id.
 *
 * Resolved from the same columns the submit upsert keys on rather than from an id passed
 * in: the composer never learns the report id, and a client-supplied one would let a
 * teacher read someone else's notes. A missing report (first submit) is simply no notes.
 */
export const loadReportStudentNotes = cache(
  async (classId: string, subjectId: string | null): Promise<Record<string, string>> => {
    const session = await getTeacherSession();
    if (!session) return {};

    const built = await buildReportDraft({
      classId,
      subjectId,
      groupName: "",
      subjectName: null,
    });
    if ("error" in built) return {};

    const supabase = await createSessionClient();
    const reportQuery = supabase
      .from("class_reports")
      .select("id")
      .eq("class_id", classId)
      .eq("teacher_profile_id", session.userId)
      .eq("period", built.period)
      .eq("tenant_id", session.tenantId);
    const { data: report } = await (
      subjectId ? reportQuery.eq("subject_id", subjectId) : reportQuery.is("subject_id", null)
    )
      .limit(1)
      .maybeSingle();
    if (!report) return {};

    const { data: notes } = await supabase
      .from("class_report_student_notes")
      .select("student_id, note")
      .eq("report_id", report.id);

    const byStudent: Record<string, string> = {};
    for (const row of notes ?? []) {
      if (row.student_id) byStudent[row.student_id] = row.note ?? "";
    }
    return byStudent;
  },
);
