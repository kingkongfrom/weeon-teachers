import { describe, expect, it } from "vitest";
import type {
  ReportAssignmentMeta,
  ReportGradesSnapshot,
} from "@/lib/reports/model";
import {
  buildReportRubroGroups,
  buildReportRubroSummary,
  buildReportStudentRows,
  reportIsWeighted,
  reportRubroContribution,
  reportRubroPercent,
} from "@/lib/reports/rubros";

const meta = (
  over: Partial<ReportAssignmentMeta> & { title: string },
): ReportAssignmentMeta => ({
  kind: "classwork",
  category: "classwork",
  points: 100,
  ...over,
});

const assignmentsMeta: Record<string, ReportAssignmentMeta> = {
  t1: meta({ title: "Tarea 1", points: 10, rubroId: "tareas", rubroName: "Tareas", rubroPeso: 30, rubroPosition: 0 }),
  e1: meta({ title: "Examen 1", points: 100, kind: "exam", category: "evaluation", rubroId: "exam", rubroName: "Examenes", rubroPeso: 40, rubroPosition: 1 }),
  t2: meta({ title: "Tarea 2", points: 20, rubroId: "tareas", rubroName: "Tareas", rubroPeso: 30, rubroPosition: 0 }),
  p1: meta({ title: "Proyecto", kind: "project", rubroId: "proj", rubroName: "Proyectos", rubroPeso: 30, rubroPosition: 2 }),
};

const grades: ReportGradesSnapshot = {
  t1: { s1: { mark: 7, maxMarks: 10 } },
  t2: { s1: { mark: 19, maxMarks: 20 } },
  e1: { s1: { mark: 60, maxMarks: 100 } },
  p1: { s1: { mark: 90, maxMarks: 100 } },
};

describe("report rubro grouping", () => {
  it("groups columns by rubro in position order", () => {
    const groups = buildReportRubroGroups(Object.keys(assignmentsMeta), assignmentsMeta, {
      tareas: { name: "Tareas", peso: 30, position: 0, archived: false },
      exam: { name: "Examenes", peso: 40, position: 1, archived: false },
      proj: { name: "Proyectos", peso: 30, position: 2, archived: false },
    });
    expect(groups.map((g) => g.name)).toEqual(["Tareas", "Examenes", "Proyectos"]);
    expect(groups[0].columns.map((c) => c.assignmentId)).toEqual(["t1", "t2"]);
  });

  it("detects weighted vs legacy snapshots", () => {
    expect(reportIsWeighted(assignmentsMeta, {})).toBe(true);
    expect(reportIsWeighted({ t1: meta({ title: "x" }) }, undefined)).toBe(false);
  });

  it("weights columns by points inside the rubro", () => {
    const groups = buildReportRubroGroups(["t1", "t2"], assignmentsMeta);
    // (70*10 + 95*20) / 30 = 86.67
    expect(reportRubroPercent(groups[0], grades, "s1")).toBeCloseTo(86.67, 1);
  });

  it("contributions are capped by the rubro peso", () => {
    const groups = buildReportRubroGroups(Object.keys(assignmentsMeta), assignmentsMeta);
    const tareas = groups.find((g) => g.name === "Tareas")!;
    const exam = groups.find((g) => g.name === "Examenes")!;
    expect(reportRubroContribution(tareas, grades, "s1")).toBeCloseTo(26, 1);
    expect(reportRubroContribution(exam, grades, "s1")).toBeCloseTo(24, 1);
    expect(reportRubroContribution(tareas, grades, "s1")).toBeLessThanOrEqual(30);
    expect(reportRubroContribution(exam, grades, "s1")).toBeLessThanOrEqual(40);
  });

  it("builds student rows with the weighted final", () => {
    const groups = buildReportRubroGroups(Object.keys(assignmentsMeta), assignmentsMeta);
    const rows = buildReportStudentRows(groups, grades, ["s1"], { s1: 74 });
    expect(rows[0].final).toBe(74);
    expect(rows[0].contributions.tareas).toBeCloseTo(26, 1);
    expect(rows[0].contributions.proj).toBeCloseTo(27, 1);
  });

  it("builds a per-rubro summary (average, columns, peso)", () => {
    const groups = buildReportRubroGroups(Object.keys(assignmentsMeta), assignmentsMeta);
    const summary = buildReportRubroSummary(groups, grades, ["s1"]);
    expect(summary.map((s) => s.name)).toEqual(["Tareas", "Examenes", "Proyectos"]);
    expect(summary[0].average).toBe(87);
    expect(summary[0].columnCount).toBe(2);
    expect(summary[1].gradedCount).toBe(1);
  });

  it("falls back to a flat group when the snapshot has no rubros", () => {
    const legacy: Record<string, ReportAssignmentMeta> = {
      a: meta({ title: "A" }),
      b: meta({ title: "B" }),
    };
    const groups = buildReportRubroGroups(["a", "b"], legacy);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBeNull();
    expect(reportRubroContribution(groups[0], grades, "s1")).toBeNull();
    const rows = buildReportStudentRows(groups, { a: { s1: { mark: 80, maxMarks: 100 } } }, ["s1"]);
    expect(rows[0].final).toBe(80);
  });
});
