import { describe, expect, it } from "vitest";
import {
  columnMaxPoints,
  columnPercent,
  roundedPercent,
  rubroPercentForStudent,
  studentFinal,
  totalPeso,
  type RubroColumn,
  type RubroInput,
} from "@/lib/dashboard/grade-weights";

const rubro = (over: Partial<RubroInput> & { id: string }): RubroInput => ({
  name: over.id,
  peso: 0,
  position: 0,
  archived: false,
  ...over,
});

const column = (
  over: Partial<RubroColumn> & { id: string; rubroId: string },
): RubroColumn => ({ points: 100, grades: {}, ...over });

const grade = (mark: number, maxMarks = 100) => ({ mark, maxMarks, status: "graded" as const });

const baseRubros = [
  rubro({ id: "tareas", name: "Tareas", peso: 30, position: 0 }),
  rubro({ id: "examenes", name: "Exámenes", peso: 50, position: 1 }),
  rubro({ id: "proyectos", name: "Proyectos", peso: 20, position: 2 }),
];

describe("columnMaxPoints", () => {
  it("defaults to 100 when points are missing", () => {
    expect(columnMaxPoints({ points: null })).toBe(100);
    expect(columnMaxPoints({ points: 0 })).toBe(100);
    expect(columnMaxPoints({ points: 20 })).toBe(20);
  });
});

describe("columnPercent", () => {
  it("returns null when the student has no row", () => {
    expect(columnPercent(column({ id: "c1", rubroId: "tareas" }), "s1")).toBeNull();
  });

  it("clamps above 100 and never returns negatives", () => {
    const c = column({
      id: "c1",
      rubroId: "tareas",
      points: 10,
      grades: { s1: grade(12, 10), s2: grade(-3, 10) },
    });
    expect(columnPercent(c, "s1")).toBe(100);
    expect(columnPercent(c, "s2")).toBe(0);
  });

  it("counts missing as 0 (data exists)", () => {
    const c = column({
      id: "c1",
      rubroId: "tareas",
      grades: { s1: { mark: 0, maxMarks: 100, status: "missing" } },
    });
    expect(columnPercent(c, "s1")).toBe(0);
  });
});

describe("rubroPercentForStudent", () => {
  it("weights columns by their points inside the rubro", () => {
    const columns = [
      column({ id: "t1", rubroId: "tareas", points: 10, grades: { s1: grade(7, 10) } }),
      column({ id: "t2", rubroId: "tareas", points: 20, grades: { s1: grade(19, 20) } }),
    ];
    // (70*10 + 95*20) / 30 = 86.67
    expect(rubroPercentForStudent(columns, "tareas", "s1")).toBeCloseTo(86.67, 1);
  });

  it("behaves like a mean when the points are equal", () => {
    const columns = [
      column({ id: "t1", rubroId: "tareas", grades: { s1: grade(70) } }),
      column({ id: "t2", rubroId: "tareas", grades: { s1: grade(90) } }),
    ];
    expect(rubroPercentForStudent(columns, "tareas", "s1")).toBe(80);
  });

  it("returns null when the rubro has no column for the student", () => {
    const columns = [column({ id: "t1", rubroId: "tareas", grades: {} })];
    expect(rubroPercentForStudent(columns, "tareas", "s1")).toBeNull();
  });

  it("ignores columns from other rubros", () => {
    const columns = [
      column({ id: "t1", rubroId: "tareas", grades: { s1: grade(50) } }),
      column({ id: "e1", rubroId: "examenes", grades: { s1: grade(100) } }),
    ];
    expect(rubroPercentForStudent(columns, "tareas", "s1")).toBe(50);
  });
});

describe("studentFinal", () => {
  it("matches the worked example in the doc (74 %)", () => {
    const columns = [
      column({ id: "t1", rubroId: "tareas", points: 10, grades: { s1: grade(7, 10) } }),
      column({ id: "t2", rubroId: "tareas", points: 20, grades: { s1: grade(19, 20) } }),
      column({ id: "e1", rubroId: "examenes", grades: { s1: grade(60) } }),
      column({ id: "p1", rubroId: "proyectos", grades: { s1: grade(90) } }),
    ];
    const result = studentFinal(baseRubros, columns, "s1");
    // tareas 86.67 * 30 + 60 * 50 + 90 * 20 = 7400 / 100
    expect(roundedPercent(result.percent)).toBe(74);
    expect(result.appliedWeight).toBe(100);
  });

  it("renormalises when a rubro has no data", () => {
    const columns = [
      column({ id: "t1", rubroId: "tareas", grades: { s1: grade(80) } }),
      column({ id: "e1", rubroId: "examenes", grades: { s1: grade(60) } }),
      column({ id: "p1", rubroId: "proyectos", grades: {} }),
    ];
    const result = studentFinal(baseRubros, columns, "s1");
    expect(roundedPercent(result.percent)).toBe(68);
    expect(result.appliedWeight).toBe(80);
    expect(result.missingRubroIds).toEqual(["proyectos"]);
  });

  it("returns null when nothing is graded", () => {
    const columns = [column({ id: "t1", rubroId: "tareas", grades: {} })];
    expect(studentFinal(baseRubros, columns, "s1").percent).toBeNull();
  });

  it("counts a closed column (missing = 0)", () => {
    const columns = [
      column({ id: "t1", rubroId: "tareas", grades: { s1: grade(80) } }),
      column({ id: "e1", rubroId: "examenes", grades: { s1: grade(60) } }),
      column({
        id: "p1",
        rubroId: "proyectos",
        grades: { s1: { mark: 0, maxMarks: 100, status: "missing" } },
      }),
    ];
    expect(roundedPercent(studentFinal(baseRubros, columns, "s1").percent)).toBe(54);
  });

  it("excludes archived rubros", () => {
    const rubros = [
      ...baseRubros.slice(0, 2),
      rubro({ id: "proyectos", peso: 20, position: 2, archived: true }),
    ];
    const columns = [
      column({ id: "t1", rubroId: "tareas", grades: { s1: grade(80) } }),
      column({ id: "e1", rubroId: "examenes", grades: { s1: grade(60) } }),
    ];
    expect(roundedPercent(studentFinal(rubros, columns, "s1").percent)).toBe(68);
  });

  it("ignores rubro peso when computing an individual rubro percentage", () => {
    const rubros = [rubro({ id: "tareas", peso: 100 })];
    const columns = [column({ id: "t1", rubroId: "tareas", grades: { s1: grade(80) } })];
    expect(roundedPercent(studentFinal(rubros, columns, "s1").percent)).toBe(80);
  });

  it("handles a total peso that is not 100 (renormalises)", () => {
    const rubros = [
      rubro({ id: "a", peso: 40 }),
      rubro({ id: "b", peso: 40 }),
    ];
    const columns = [
      column({ id: "ca", rubroId: "a", grades: { s1: grade(100) } }),
      column({ id: "cb", rubroId: "b", grades: { s1: grade(50) } }),
    ];
    expect(roundedPercent(studentFinal(rubros, columns, "s1").percent)).toBe(75);
  });
});

describe("totalPeso", () => {
  it("sums only active rubros", () => {
    expect(
      totalPeso([...baseRubros, rubro({ id: "old", peso: 10, archived: true })]),
    ).toBe(100);
  });
});
