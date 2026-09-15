import "server-only";

import { cache } from "react";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadGradebookContext } from "@/lib/dashboard/gradebook";
import { buildReportDraft } from "@/lib/reports/build-snapshot";
import type { ReportDraft } from "@/lib/reports/model";
import { getLocale } from "@/lib/i18n/server";

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
