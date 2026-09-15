/** Shared conduct vocabulary — labels live in i18n; keys are stored in DB. */

export type ConductKind = "merit" | "demerit";

export type ConductCategory =
  | "punctuality"
  | "respect"
  | "participation"
  | "collaboration"
  | "order"
  | "uniform"
  | "devices"
  | "coexistence"
  | "improvement"
  | "other";

/** Every category the DB accepts (union of merit + demerit lists). */
export const CONDUCT_CATEGORIES: ConductCategory[] = [
  "punctuality",
  "respect",
  "participation",
  "collaboration",
  "order",
  "uniform",
  "devices",
  "coexistence",
  "improvement",
  "other",
];

/** Categories offered when logging a mérito. */
export const MERIT_CATEGORIES: ConductCategory[] = [
  "participation",
  "collaboration",
  "improvement",
  "respect",
  "order",
  "coexistence",
  "other",
];

/** Categories offered when logging a falta. */
export const DEMERIT_CATEGORIES: ConductCategory[] = [
  "punctuality",
  "respect",
  "order",
  "uniform",
  "devices",
  "coexistence",
  "other",
];

export function categoriesForKind(kind: ConductKind): ConductCategory[] {
  return kind === "merit" ? MERIT_CATEGORIES : DEMERIT_CATEGORIES;
}

export function isCategoryValidForKind(
  kind: ConductKind,
  category: ConductCategory,
): boolean {
  return categoriesForKind(kind).includes(category);
}

export function defaultCategoryForKind(kind: ConductKind): ConductCategory {
  return categoriesForKind(kind)[0];
}

export type ConductRecord = {
  id: string;
  studentId: string;
  occurredOn: string;
  kind: ConductKind;
  category: ConductCategory;
  description: string;
  points: number;
  recordedByName: string | null;
  createdAt: string;
};

export type ConductStudentSummary = {
  studentId: string;
  meritCount: number;
  demeritCount: number;
  netPoints: number;
};

/** Signed net: merits add points, demerits subtract. */
export function signedPoints(kind: ConductKind, points: number): number {
  return kind === "merit" ? points : -points;
}

export function summarizeConduct(records: ConductRecord[]): Map<string, ConductStudentSummary> {
  const out = new Map<string, ConductStudentSummary>();
  for (const row of records) {
    const current = out.get(row.studentId) ?? {
      studentId: row.studentId,
      meritCount: 0,
      demeritCount: 0,
      netPoints: 0,
    };
    if (row.kind === "merit") current.meritCount += 1;
    else current.demeritCount += 1;
    current.netPoints += signedPoints(row.kind, row.points);
    out.set(row.studentId, current);
  }
  return out;
}
