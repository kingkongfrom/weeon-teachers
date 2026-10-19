/**
 * Rubro (category) view of a submitted class report.
 *
 * Pure: no React, no Supabase. The teacher `/reportes` page and the future
 * admin report view in `weeon-tenants` must both render reports through this
 * module so the numbers always match the gradebook:
 *   column contribution = rubro % × peso   (capped at the rubro peso)
 *   student FINAL       = Σ contributions   (whole %)
 *
 * Reports submitted before rubros have no rubro metadata; they fall back to the
 * flat column order and the plain column average.
 */

import type {
  ReportAssignmentMeta,
  ReportGradesSnapshot,
  ReportRubroMeta,
} from "@/lib/reports/model";
import { reportStudentPercent } from "@/lib/reports/grades";

export type ReportColumn = ReportAssignmentMeta & { assignmentId: string };

export type ReportRubroGroup = {
  /** Rubro id, or `null` for columns with no rubro (legacy / "Sin rubro"). */
  id: string | null;
  name: string | null;
  peso: number | null;
  position: number;
  columns: ReportColumn[];
};

/** One cell of the report table: raw mark reduced to a percentage. */
export function reportColumnPercent(
  grades: ReportGradesSnapshot,
  assignmentId: string,
  studentId: string,
): number | null {
  const grade = grades[assignmentId]?.[studentId];
  if (!grade) return null;
  const max = grade.maxMarks || 100;
  if (max <= 0) return null;
  const pct = (grade.mark / max) * 100;
  return Math.max(0, Math.min(100, pct));
}

/** True when the snapshot carries rubro data (submitted after the feature). */
export function reportIsWeighted(
  assignmentsMeta: Record<string, ReportAssignmentMeta>,
  rubros: ReportRubroMeta | undefined,
): boolean {
  if (!rubros) return false;
  return Object.values(assignmentsMeta).some((meta) => meta.rubroId != null);
}

function columnPeso(column: ReportColumn, rubros?: ReportRubroMeta): number | null {
  if (column.rubroPeso != null) return column.rubroPeso;
  if (column.rubroId && rubros?.[column.rubroId]) return rubros[column.rubroId].peso;
  return null;
}

function columnPosition(column: ReportColumn, rubros?: ReportRubroMeta): number {
  if (column.rubroPosition != null) return column.rubroPosition;
  if (column.rubroId && rubros?.[column.rubroId]) return rubros[column.rubroId].position;
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Ordered rubro groups. Columns without a rubro are grouped together at the
 * end under `id: null` and are never weighted.
 */
export function buildReportRubroGroups(
  assignmentIds: string[],
  assignmentsMeta: Record<string, ReportAssignmentMeta>,
  rubros?: ReportRubroMeta,
): ReportRubroGroup[] {
  const columns: ReportColumn[] = assignmentIds.map((assignmentId) => ({
    assignmentId,
    ...(assignmentsMeta[assignmentId] ?? {
      title: assignmentId.slice(0, 6),
      kind: "classwork" as const,
      category: "classwork" as const,
      points: null,
    }),
  }));

  const groups = new Map<string, ReportRubroGroup>();
  for (const column of columns) {
    const key = column.rubroId ?? "__none";
    let group = groups.get(key);
    if (!group) {
      const meta = column.rubroId ? rubros?.[column.rubroId] : undefined;
      group = {
        id: column.rubroId ?? null,
        name: column.rubroName ?? meta?.name ?? null,
        peso: columnPeso(column, rubros),
        position: columnPosition(column, rubros),
        columns: [],
      };
      groups.set(key, group);
    }
    group.columns.push(column);
  }

  return [...groups.values()].sort(
    (a, b) =>
      a.position - b.position ||
      (a.name ?? "\uffff").localeCompare(b.name ?? "\uffff", "es"),
  );
}

/** Weighted % of one student inside one rubro (points-weighted columns). */
export function reportRubroPercent(
  group: ReportRubroGroup,
  grades: ReportGradesSnapshot,
  studentId: string,
): number | null {
  if (!group.id) return null;
  let weighted = 0;
  let totalPoints = 0;
  for (const column of group.columns) {
    const pct = reportColumnPercent(grades, column.assignmentId, studentId);
    if (pct == null) continue;
    const points = column.points != null && column.points > 0 ? column.points : 100;
    weighted += pct * points;
    totalPoints += points;
  }
  if (totalPoints <= 0) return null;
  return weighted / totalPoints;
}

/**
 * Contribution of one rubro to the student's final: `rubro % × peso`, capped by
 * construction at the rubro peso. One decimal (28.5), so the subtotals add up.
 * `null` for unweighted groups ("Sin rubro") or when the rubro has no grades.
 */
export function reportRubroContribution(
  group: ReportRubroGroup,
  grades: ReportGradesSnapshot,
  studentId: string,
): number | null {
  const percent = reportRubroPercent(group, grades, studentId);
  if (percent == null || group.peso == null) return null;
  return Math.round((percent * group.peso) / 10) / 10;
}

export type ReportStudentRubroRow = {
  studentId: string;
  /** Whole-percent final, matching the gradebook (weighted when available). */
  final: number | null;
  /** `rubroId (or "none") → contribution`, same keys as the groups. */
  contributions: Record<string, number | null>;
  /** `rubroId → rubro %`, used for the tooltip / detail. */
  rubroPercents: Record<string, number | null>;
};

export function buildReportStudentRows(
  groups: ReportRubroGroup[],
  grades: ReportGradesSnapshot,
  studentIds: string[],
  finals?: Record<string, number>,
): ReportStudentRubroRow[] {
  return studentIds.map((studentId) => {
    const contributions: Record<string, number | null> = {};
    const rubroPercents: Record<string, number | null> = {};
    for (const group of groups) {
      const key = group.id ?? "none";
      contributions[key] = reportRubroContribution(group, grades, studentId);
      rubroPercents[key] = reportRubroPercent(group, grades, studentId);
    }
    const weighted = reportStudentPercent(grades, studentId, finals);
    return {
      studentId,
      final: weighted == null ? null : Math.round(weighted),
      contributions,
      rubroPercents,
    };
  });
}

export type ReportRubroSummary = {
  id: string | null;
  name: string | null;
  peso: number | null;
  columnCount: number;
  /** Class average of the rubro % (0-100), whole number. */
  average: number | null;
  /** How many students have a rubro contribution. */
  gradedCount: number;
};

export function buildReportRubroSummary(
  groups: ReportRubroGroup[],
  grades: ReportGradesSnapshot,
  studentIds: string[],
): ReportRubroSummary[] {
  return groups.map((group) => {
    let sum = 0;
    let count = 0;
    for (const studentId of studentIds) {
      const pct = reportRubroPercent(group, grades, studentId);
      if (pct == null) continue;
      sum += pct;
      count += 1;
    }
    return {
      id: group.id,
      name: group.name,
      peso: group.peso,
      columnCount: group.columns.length,
      average: count > 0 ? Math.round(sum / count) : null,
      gradedCount: count,
    };
  });
}

/** Group by the legacy two-value category; used only for unweighted reports. */
export function countReportColumnsByCategory(
  groups: ReportRubroGroup[],
): { classwork: number; evaluation: number } {
  const counts = { classwork: 0, evaluation: 0 };
  for (const group of groups) {
    for (const column of group.columns) {
      if (column.category === "evaluation") counts.evaluation += 1;
      else counts.classwork += 1;
    }
  }
  return counts;
}
