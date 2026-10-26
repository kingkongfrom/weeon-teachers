import { describe, expect, it } from "vitest";
import { studentFinal, type RubroColumn, type RubroInput } from "@/lib/dashboard/grade-weights";
import { finalScore, type ScoreColumn, type ScoreRubro } from "@/lib/dashboard/scoreboard";

/**
 * The report and the gradebook used to compute FINAL through different modules:
 * reports on `grade-weights`, the matrix on `scoreboard`. Two copies of a rule
 * this consequential is how the gradebook once showed 225% next to a 93% final —
 * so the report is being moved onto `scoreboard`, and these cases prove the move
 * changes no number.
 *
 * If this test ever fails, one of the two drifted. That is the signal to stop and
 * reconcile, because a report a teacher hands to dirección must match the screen.
 */

const rubro = (over: Partial<ScoreRubro> & { id: string }): ScoreRubro => ({
  name: over.id,
  peso: 0,
  position: 0,
  archived: false,
  ...over,
});

const legacyRubro = (over: Partial<RubroInput> & { id: string }): RubroInput => ({
  name: over.id,
  peso: 0,
  position: 0,
  archived: false,
  ...over,
});

type Case = {
  name: string;
  rubros: ScoreRubro[];
  columns: ScoreColumn[];
  students: string[];
};

const cases: Case[] = [
  {
    name: "balanced rubric with full grades",
    rubros: [
      rubro({ id: "hw", peso: 30, position: 0 }),
      rubro({ id: "ex", peso: 70, position: 1 }),
    ],
    columns: [
      { id: "c1", rubroId: "hw", points: 10, grades: { s1: { mark: 8, maxMarks: 10 } } },
      { id: "c2", rubroId: "hw", points: 20, grades: { s1: { mark: 18, maxMarks: 20 } } },
      { id: "c3", rubroId: "ex", points: 100, grades: { s1: { mark: 63, maxMarks: 100 } } },
    ],
    students: ["s1"],
  },
  {
    name: "one rubro ungraded (renormalised final)",
    rubros: [
      rubro({ id: "hw", peso: 30, position: 0 }),
      rubro({ id: "ex", peso: 70, position: 1 }),
    ],
    columns: [
      { id: "c1", rubroId: "hw", points: 10, grades: { s1: { mark: 9, maxMarks: 10 } } },
      { id: "c2", rubroId: "ex", points: 100, grades: {} },
    ],
    students: ["s1"],
  },
  {
    name: "weights that do not total 100",
    rubros: [
      rubro({ id: "hw", peso: 25, position: 0 }),
      rubro({ id: "ex", peso: 40, position: 1 }),
    ],
    columns: [
      { id: "c1", rubroId: "hw", points: 10, grades: { s1: { mark: 10, maxMarks: 10 } } },
      { id: "c2", rubroId: "ex", points: 50, grades: { s1: { mark: 25, maxMarks: 50 } } },
    ],
    students: ["s1"],
  },
  {
    name: "unassigned columns and an archived rubro",
    rubros: [
      rubro({ id: "hw", peso: 50, position: 0 }),
      rubro({ id: "old", peso: 50, position: 1, archived: true }),
    ],
    columns: [
      { id: "c1", rubroId: "hw", points: 10, grades: { s1: { mark: 7, maxMarks: 10 } } },
      { id: "c2", rubroId: null, points: 10, grades: { s1: { mark: 5, maxMarks: 10 } } },
      { id: "c3", rubroId: "old", points: 10, grades: { s1: { mark: 10, maxMarks: 10 } } },
    ],
    students: ["s1"],
  },
  {
    name: "several students, partial marks",
    rubros: [rubro({ id: "hw", peso: 100, position: 0 })],
    columns: [
      { id: "c1", rubroId: "hw", points: 10, grades: { s1: { mark: 6, maxMarks: 10 }, s2: { mark: 10, maxMarks: 10 } } },
      { id: "c2", rubroId: "hw", points: 10, grades: { s1: { mark: 4, maxMarks: 10 } } },
    ],
    students: ["s1", "s2", "s3"],
  },
  {
    name: "points frozen at a scale different from the mark",
    rubros: [rubro({ id: "ex", peso: 100, position: 0 })],
    columns: [
      { id: "c1", rubroId: "ex", points: 30, grades: { s1: { mark: 27, maxMarks: 30 } } },
      { id: "c2", rubroId: "ex", points: 5, grades: { s1: { mark: 3, maxMarks: 5 } } },
    ],
    students: ["s1"],
  },
];

describe("report and gradebook agree on FINAL", () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      // The report feeds the same columns through the old module.
      const legacyColumns: RubroColumn[] = testCase.columns.map((column) => ({
        id: column.id,
        rubroId: column.rubroId,
        points: column.points,
        grades: Object.fromEntries(
          Object.entries(column.grades).map(([studentId, grade]) => [
            studentId,
            { mark: grade.mark, maxMarks: grade.maxMarks, status: "graded" },
          ]),
        ),
      }));
      const legacyRubros: RubroInput[] = testCase.rubros.map(legacyRubro);

      for (const studentId of testCase.students) {
        const before = studentFinal(legacyRubros, legacyColumns, studentId).percent;
        const after = finalScore(testCase.rubros, testCase.columns, studentId).percent;

        if (before == null || after == null) {
          expect(after).toBe(before);
        } else {
          // Same number to floating-point noise; the report rounds for display.
          expect(after).toBeCloseTo(before, 9);
          expect(Math.round(after)).toBe(Math.round(before));
        }
      }
    });
  }
});
