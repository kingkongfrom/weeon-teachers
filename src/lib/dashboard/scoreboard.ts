/**
 * Scoreboard model — the one place that turns raw columns + rubros into every
 * number the Calificaciones matrix shows.
 *
 * Before this module the gradebook computed the same figure in several places
 * (rubro total, block footer, FINAL, footer average) with slightly different
 * formulas, which is how a cell ended at 225 % while FINAL said 93 %. Every
 * displayed value now comes from here, so the columns, the footer and the CSV
 * can never disagree.
 *
 * Vocabulary (see `docs/calificaciones-rubros.md` §3):
 *  - **Puntos** (`assignments.points`) — the max of a single column.
 *  - **Nota del rubro** — the student's points-weighted % inside a rubro (0–100).
 *  - **Peso** (`grade_rubros.peso`) — the rubro's share of FINAL.
 *  - **Aporte** — `nota × peso / 100`, the rubro's share of FINAL, max = peso.
 *  - **FINAL** — Σ aporte ÷ Σ peso of the rubros that have data.
 *
 * Pure: no React, no Supabase. The gradebook, the CSV, the print view and the
 * transcript import it.
 */

export type ScoreRubro = {
  id: string;
  name: string;
  peso: number;
  position: number;
  archived: boolean;
};

export type ScoreGrade = { mark: number; maxMarks: number };

export type ScoreColumn = {
  id: string;
  rubroId: string | null;
  points: number | null;
  /** Grades keyed by student id; a missing entry means "no data". */
  grades: Record<string, ScoreGrade>;
};

/** Column max points; null/0 → 100 (the gradebook default). */
export function maxPoints(points: number | null): number {
  return points != null && points > 0 ? points : 100;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/** One column's grade for one student (0–100), or null without data. */
export function columnGrade(column: ScoreColumn, studentId: string): number | null {
  const grade = column.grades[studentId];
  if (!grade) return null;
  const max = grade.maxMarks > 0 ? grade.maxMarks : maxPoints(column.points);
  if (max <= 0) return null;
  return clampPercent((grade.mark / max) * 100);
}

/** One column's max for one student (`grades.max_marks` may differ). */
export function columnMaxForStudent(column: ScoreColumn, studentId: string): number {
  const grade = column.grades[studentId];
  return grade && grade.maxMarks > 0 ? grade.maxMarks : maxPoints(column.points);
}

export type RubroScore = {
  rubroId: string | null;
  /** Points-weighted grade 0–100. */
  percent: number | null;
  /** Points the student earned in the rubro (graded columns only). */
  points: number | null;
  /** Points the rubro is worth for this student (its columns' max). */
  maxPoints: number;
  /** Columns that carry a grade. */
  gradedCount: number;
  columnCount: number;
  /** Share of FINAL (`percent × peso / 100`), null without data. */
  aporte: number | null;
  peso: number;
};

/**
 * A student's standing inside one rubro: the rubro grade, the raw points and
 * the aporte — the three numbers a scoreboard shows side by side
 * (`28 (93%)`, `22.5%`, …).
 */
export function rubroScore(
  rubro: ScoreRubro | null,
  columns: ScoreColumn[],
  studentId: string,
  peso: number,
): RubroScore {
  let weighted = 0;
  let weightSum = 0;
  let points = 0;
  let max = 0;
  let gradedCount = 0;

  for (const column of columns) {
    const columnMax = columnMaxForStudent(column, studentId);
    max += columnMax;
    const grade = columnGrades(column, studentId);
    if (grade == null) continue;
    gradedCount += 1;
    weighted += grade.percent * grade.max;
    weightSum += grade.max;
    points += grade.mark;
  }

  const percent = weightSum > 0 ? clampPercent(weighted / weightSum) : null;
  return {
    rubroId: rubro?.id ?? null,
    percent,
    points: gradedCount > 0 ? points : null,
    maxPoints: max,
    gradedCount,
    columnCount: columns.length,
    aporte: percent == null ? null : Math.round(percent * peso) / 100,
    peso,
  };
}

/** Raw mark + the max used for it (works even when `max_marks` is absent). */
function columnGrades(
  column: ScoreColumn,
  studentId: string,
): { mark: number; max: number; percent: number } | null {
  const grade = column.grades[studentId];
  if (!grade) return null;
  const max = columnMaxForStudent(column, studentId);
  if (max <= 0) return null;
  return { mark: grade.mark, max, percent: clampPercent((grade.mark / max) * 100) };
}

export type FinalScore = {
  /** Weighted final 0–100 (raw, not rounded). */
  percent: number | null;
  /** Sum of pesos actually counted (renormalisation denominator). */
  appliedWeight: number;
  /** Rubro grades that fed the final, in rubric order. */
  rubricos: RubroScore[];
  /** Active rubros with columns but no grades yet — excluded from the final. */
  pendingRubroIds: string[];
};

/**
 * FINAL for one student. Renormalised over the rubros that have data, so a
 * class in October shows the average of what has been graded rather than a
 * fraction of it. A rubro with no columns never counts.
 */
export function finalScore(
  rubros: ScoreRubro[],
  columns: ScoreColumn[],
  studentId: string,
): FinalScore {
  let weighted = 0;
  let appliedWeight = 0;
  const scores: RubroScore[] = [];
  const pendingRubroIds: string[] = [];

  for (const rubro of orderedScoreRubros(rubros)) {
    if (rubro.archived) continue;
    const rubroColumns = columns.filter((column) => column.rubroId === rubro.id);
    if (rubroColumns.length === 0) continue;
    const score = rubroScore(rubro, rubroColumns, studentId, rubro.peso);
    scores.push(score);
    if (score.percent == null) {
      pendingRubroIds.push(rubro.id);
      continue;
    }
    weighted += score.percent * rubro.peso;
    appliedWeight += rubro.peso;
  }

  return {
    percent: appliedWeight > 0 ? weighted / appliedWeight : null,
    appliedWeight,
    rubricos: scores,
    pendingRubroIds,
  };
}

export type ClassStats = {
  /** Students with a final grade. */
  graded: number;
  total: number;
  average: number | null;
  /** Middle of the graded series (mean of the two middle values when even). */
  median: number | null;
  passRate: number | null;
  highest: number | null;
  lowest: number | null;
};

/** Class-level aggregate of any 0–100 series (final, rubro grade, …). */
export function classStats(values: (number | null)[]): ClassStats {
  const nums = values.filter((value): value is number => value != null);
  if (nums.length === 0) {
    return {
      graded: 0,
      total: values.length,
      average: null,
      median: null,
      passRate: null,
      highest: null,
      lowest: null,
    };
  }
  const sum = nums.reduce((total, value) => total + value, 0);
  const pass = nums.filter((value) => value >= 70).length;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    graded: nums.length,
    total: values.length,
    average: Math.round((sum / nums.length) * 10) / 10,
    median: Math.round(median * 10) / 10,
    passRate: Math.round((pass / nums.length) * 100),
    // Spread over the full array: Math.min(...nums) would blow the stack on a
    // very large class.
    highest: sorted[sorted.length - 1],
    lowest: sorted[0],
  };
}

/**
 * Whether a student can still pass. A student below the pass mark needs the
 * remaining (ungraded) weight to close the gap: `need = pass - current`.
 * Returns `null` when every active rubro is graded (status is final).
 */
export function canStillPass(
  final: FinalScore,
  pass = 70,
): { pass: boolean | null; neededOnRemaining: number | null; remainingWeight: number } | null {
  if (final.percent == null) return null;
  if (final.pendingRubroIds.length === 0) return null;
  const remainingWeight = 100 - final.appliedWeight;
  if (remainingWeight <= 0) return null;
  if (final.percent >= pass) {
    return { pass: true, neededOnRemaining: 0, remainingWeight };
  }
  // current * applied + x * remaining = pass * 100
  const needed =
    (pass * 100 - final.percent * final.appliedWeight) / remainingWeight;
  return {
    pass: needed <= 100,
    neededOnRemaining: Math.round(needed * 10) / 10,
    remainingWeight,
  };
}

/** Rubros in display order (position, then name). */
export function orderedScoreRubros<T extends ScoreRubro>(rubros: T[]): T[] {
  return [...rubros].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"),
  );
}

/** Whole percent, for FINAL cells. */
export function displayPercent(value: number | null): number | null {
  return value == null ? null : Math.round(value);
}

/** One decimal, for aportes and averages. */
export function displayDecimal(value: number | null): number | null {
  return value == null ? null : Math.round(value * 10) / 10;
}
