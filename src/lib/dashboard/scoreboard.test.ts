import { describe, expect, it } from "vitest";
import {
  canStillPass,
  classStats,
  columnGrade,
  finalScore,
  maxPoints,
  rubroScore,
  type ScoreColumn,
  type ScoreRubro,
} from "./scoreboard";

const rubro = (over: Partial<ScoreRubro> & { id: string }): ScoreRubro => ({
  name: over.id,
  peso: 0,
  position: 0,
  archived: false,
  ...over,
});

const column = (
  over: Partial<ScoreColumn> & { id: string; rubroId: string },
): ScoreColumn => ({ points: 10, grades: {}, ...over });

const grade = (mark: number, maxMarks = 10) => ({ mark, maxMarks });

describe("maxPoints", () => {
  it("falls back to 100 for null or zero", () => {
    expect(maxPoints(null)).toBe(100);
    expect(maxPoints(0)).toBe(100);
    expect(maxPoints(25)).toBe(25);
  });
});

describe("columnGrade", () => {
  it("is null without data and clamps above 100", () => {
    const c = column({ id: "c1", rubroId: "r", points: 10 });
    expect(columnGrade(c, "s1")).toBeNull();
    const over = column({ id: "c2", rubroId: "r", points: 10, grades: { s1: grade(12) } });
    expect(columnGrade(over, "s1")).toBe(100);
  });
});

describe("rubroScore", () => {
  const tareas = rubro({ id: "tareas", name: "Tareas", peso: 25, position: 0 });
  const columns = [
    column({ id: "t1", rubroId: "tareas", grades: { s1: grade(8) } }),
    column({ id: "t2", rubroId: "tareas", grades: { s1: grade(10) } }),
    column({ id: "t3", rubroId: "tareas", grades: { s1: grade(10) } }),
  ];

  it("reports earned points, max points and the weighted grade", () => {
    const score = rubroScore(tareas, columns, "s1", 25);
    expect(score.points).toBe(28);
    expect(score.maxPoints).toBe(30);
    expect(score.percent).toBeCloseTo(93.33, 1);
    expect(score.aporte).toBeCloseTo(23.33, 1);
    expect(score.gradedCount).toBe(3);
    expect(score.columnCount).toBe(3);
  });

  it("weights columns by their points (20 pts counts double 10)", () => {
    const weighted = [
      column({ id: "a", rubroId: "tareas", points: 10, grades: { s1: grade(10, 10) } }),
      column({ id: "b", rubroId: "tareas", points: 20, grades: { s1: grade(20, 20) } }),
    ];
    expect(rubroScore(tareas, weighted, "s1", 25).percent).toBe(100);
    // A perfect 10-pt column cannot outweigh a 50 %-of-20 one: 10+10 of 30.
    const mixed = [
      column({ id: "a", rubroId: "tareas", points: 10, grades: { s1: grade(10, 10) } }),
      column({ id: "b", rubroId: "tareas", points: 20, grades: { s1: grade(10, 20) } }),
    ];
    expect(rubroScore(tareas, mixed, "s1", 25).percent).toBeCloseTo(66.67, 1);
  });

  it("counts only graded columns, never a silent zero", () => {
    const partial = [columns[0], columns[1], column({ id: "t4", rubroId: "tareas" })];
    const score = rubroScore(tareas, partial, "s1", 25);
    expect(score.points).toBe(18);
    expect(score.gradedCount).toBe(2);
    expect(score.maxPoints).toBe(30);
    expect(score.percent).toBe(90);
  });

  it("never exceeds the peso in its aporte", () => {
    const perfect = [
      column({ id: "p", rubroId: "tareas", points: 10, grades: { s1: grade(10) } }),
    ];
    expect(rubroScore(tareas, perfect, "s1", 25).aporte).toBe(25);
  });

  it("has no score without any grade", () => {
    const score = rubroScore(tareas, [column({ id: "e", rubroId: "tareas" })], "s1", 25);
    expect(score.percent).toBeNull();
    expect(score.points).toBeNull();
    expect(score.aporte).toBeNull();
  });
});

describe("finalScore", () => {
  const rubros = [
    rubro({ id: "tareas", name: "Tareas", peso: 25, position: 0 }),
    rubro({ id: "examenes", name: "Exámenes", peso: 75, position: 1 }),
  ];

  it("weights each rubro grade by its peso", () => {
    const columns = [
      column({ id: "t", rubroId: "tareas", grades: { s1: grade(10, 10) } }),
      column({ id: "e", rubroId: "examenes", points: 100, grades: { s1: grade(50, 100) } }),
    ];
    expect(finalScore(rubros, columns, "s1").percent).toBe(62.5);
  });

  it("renormalises over the rubros that have data", () => {
    const columns = [
      column({ id: "t", rubroId: "tareas", grades: { s1: grade(10, 10) } }),
      column({ id: "e", rubroId: "examenes", points: 100 }),
    ];
    const final = finalScore(rubros, columns, "s1");
    expect(final.percent).toBe(100);
    expect(final.appliedWeight).toBe(25);
    expect(final.pendingRubroIds).toEqual(["examenes"]);
  });

  it("ignores archived rubros and rubros without columns", () => {
    const extra = [
      ...rubros,
      rubro({ id: "vacio", name: "Vacío", peso: 50, position: 2 }),
      rubro({ id: "old", name: "Viejo", peso: 50, position: 3, archived: true }),
    ];
    const columns = [
      column({ id: "t", rubroId: "tareas", grades: { s1: grade(10, 10) } }),
    ];
    expect(finalScore(extra, columns, "s1").percent).toBe(100);
  });

  it("is null when nothing is graded", () => {
    const columns = [column({ id: "t", rubroId: "tareas" })];
    expect(finalScore(rubros, columns, "s1").percent).toBeNull();
  });
});

describe("classStats", () => {
  it("reports average, pass rate, highest and lowest", () => {
    const stats = classStats([90, 70, 50, null]);
    expect(stats.graded).toBe(3);
    expect(stats.total).toBe(4);
    expect(stats.average).toBe(70);
    expect(stats.passRate).toBe(67);
    expect(stats.highest).toBe(90);
    expect(stats.lowest).toBe(50);
  });

  it("takes the median of an odd series and averages the middle pair when even", () => {
    expect(classStats([90, 50, 70]).median).toBe(70);
    expect(classStats([90, 50, 70, 60]).median).toBe(65);
    // Order is irrelevant: the median is a position, not the input order.
    expect(classStats([12, 99, 74, 74, 30]).median).toBe(74);
  });

  it("is empty-safe", () => {
    expect(classStats([null, null]).average).toBeNull();
    expect(classStats([null]).median).toBeNull();
    expect(classStats([]).total).toBe(0);
  });
});

describe("canStillPass", () => {
  const rubros = [
    rubro({ id: "tareas", name: "Tareas", peso: 20, position: 0 }),
    rubro({ id: "examenes", name: "Exámenes", peso: 80, position: 1 }),
  ];

  it("is null when every rubro is graded", () => {
    const columns = [
      column({ id: "t", rubroId: "tareas", grades: { s1: grade(10, 10) } }),
      column({ id: "e", rubroId: "examenes", points: 100, grades: { s1: grade(100) } }),
    ];
    expect(canStillPass(finalScore(rubros, columns, "s1"))).toBeNull();
  });

  it("tells a failing student they can no longer pass", () => {
    const columns = [
      column({ id: "t", rubroId: "tareas", grades: { s1: grade(0, 10) } }),
      column({ id: "e", rubroId: "examenes", points: 100 }),
    ];
    // Renormalised, the 0 % Tareas counts alone: 0 %. Needs 70 on 80 of the
    // final → (70 × 100 − 0 × 20) / 80 = 87.5, so it is still reachable.
    const risk = canStillPass(finalScore(rubros, columns, "s1"));
    expect(risk?.pass).toBe(true);
    expect(risk?.remainingWeight).toBe(80);
    expect(risk?.neededOnRemaining).toBe(87.5);
  });

  it("flags a student who cannot reach the pass mark", () => {
    const heavy = [
      rubro({ id: "tareas", name: "Tareas", peso: 80, position: 0 }),
      rubro({ id: "examenes", name: "Exámenes", peso: 20, position: 1 }),
    ];
    const columns = [
      column({ id: "t", rubroId: "tareas", grades: { s1: grade(2, 10) } }),
      column({ id: "e", rubroId: "examenes", points: 100 }),
    ];
    // (70 × 100 − 20 × 80) / 20 = 270 → impossible.
    const risk = canStillPass(finalScore(heavy, columns, "s1"));
    expect(risk?.pass).toBe(false);
    expect(risk?.neededOnRemaining).toBe(270);
  });

  it("marks a passing student as safe", () => {
    const columns = [
      column({ id: "t", rubroId: "tareas", grades: { s1: grade(10, 10) } }),
      column({ id: "e", rubroId: "examenes", points: 100 }),
    ];
    expect(canStillPass(finalScore(rubros, columns, "s1"))?.pass).toBe(true);
  });
});
