/**
 * Weighted-rubro maths for the gradebook.
 *
 * Pure: no React, no Supabase, no `server-only`. The gradebook, the student
 * transcript and (later) the report composer must all import these helpers so
 * the final note is computed exactly once. See
 * `docs/calificaciones-rubros.md` §3.
 *
 * Two different numbers exist and must not be confused:
 *  - column `points`  → relative value *inside* a rubro (10 pts vs 20 pts).
 *  - rubro `peso`     → share of the subject final (Tareas 30 %).
 */

export type RubroInput = {
  id: string;
  name: string;
  peso: number;
  position: number;
  archived: boolean;
};

export type RubroGrade = {
  mark: number;
  maxMarks: number;
  status: "graded" | "missing";
};

export type RubroColumn = {
  id: string;
  rubroId: string | null;
  points: number | null;
  grades: Record<string, RubroGrade>;
};

/** Max points of a column; null → 100 (matches the gradebook default). */
export function columnMaxPoints(column: Pick<RubroColumn, "points">): number {
  if (column.points != null && column.points > 0) return column.points;
  return 100;
}

/** A cell's percentage (0–100), or null when the student has no data. */
export function columnPercent(
  column: RubroColumn,
  studentId: string,
): number | null {
  const grade = column.grades[studentId];
  if (!grade) return null;
  const max = grade.maxMarks > 0 ? grade.maxMarks : columnMaxPoints(column);
  if (max <= 0) return null;
  return clampPercent((grade.mark / max) * 100);
}

/**
 * Points-weighted percentage for one rubro, or null when the student has no
 * graded column in it. A 20-pt column outweighs a 10-pt column 2:1.
 */
export function rubroPercentForStudent(
  columns: RubroColumn[],
  rubroId: string,
  studentId: string,
): number | null {
  let weighted = 0;
  let totalPoints = 0;

  for (const column of columns) {
    if (column.rubroId !== rubroId) continue;
    const pct = columnPercent(column, studentId);
    if (pct == null) continue;
    const points = columnMaxPoints(column);
    weighted += pct * points;
    totalPoints += points;
  }

  if (totalPoints <= 0) return null;
  return weighted / totalPoints;
}

export type RubroBreakdown = {
  rubro: RubroInput;
  percent: number | null;
  applied: boolean;
  columnCount: number;
};

/** Per-rubro breakdown for one student (drives the footer / transcript). */
export function rubroBreakdownForStudent(
  rubros: RubroInput[],
  columns: RubroColumn[],
  studentId: string,
): RubroBreakdown[] {
  return orderedRubros(rubros).map((rubro) => {
    const percent = rubro.archived
      ? null
      : rubroPercentForStudent(columns, rubro.id, studentId);
    return {
      rubro,
      percent,
      applied: percent != null,
      columnCount: columns.filter((column) => column.rubroId === rubro.id).length,
    };
  });
}

export type FinalResult = {
  percent: number | null;
  /** Sum of pesos that actually contributed (renormalisation denominator). */
  appliedWeight: number;
  missingRubroIds: string[];
};

/**
 * Weighted subject final, renormalised over the rubros that have data.
 * A subject with only Tareas graded returns the Tareas average, not 30 % of it.
 */
export function studentFinal(
  rubros: RubroInput[],
  columns: RubroColumn[],
  studentId: string,
): FinalResult {
  let weighted = 0;
  let appliedWeight = 0;
  const missingRubroIds: string[] = [];

  for (const rubro of rubros) {
    if (rubro.archived) continue;
    const percent = rubroPercentForStudent(columns, rubro.id, studentId);
    if (percent == null) {
      if (columns.some((column) => column.rubroId === rubro.id)) {
        missingRubroIds.push(rubro.id);
      }
      continue;
    }
    weighted += percent * rubro.peso;
    appliedWeight += rubro.peso;
  }

  return {
    percent: appliedWeight > 0 ? weighted / appliedWeight : null,
    appliedWeight,
    missingRubroIds,
  };
}

/** Whole-percent display value, matching the gradebook's rounding. */
export function roundedPercent(value: number | null): number | null {
  return value == null ? null : Math.round(value);
}

/** Total peso of the rubros that are not archived. */
export function totalPeso(rubros: RubroInput[]): number {
  return rubros.reduce((sum, rubro) => (rubro.archived ? sum : sum + rubro.peso), 0);
}

/** Rubros in display order (position, then name as a stable tiebreak). */
export function orderedRubros<T extends RubroInput>(rubros: T[]): T[] {
  return [...rubros].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"),
  );
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
