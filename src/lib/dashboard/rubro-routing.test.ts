import { describe, expect, it } from "vitest";
import { normalizeRubroName, resolveRubroForKind } from "./rubro-routing";
import { kindForRouting } from "./exams";

const rubro = (over: {
  id: string;
  name: string;
  defaultKind?: "homework" | "exam" | null;
  position?: number;
}) => ({
  id: over.id,
  name: over.name,
  peso: 0,
  position: over.position ?? 0,
  archived: false,
  defaultKind: over.defaultKind ?? null,
});

/**
 * Contract shared with `public.resolve_rubro_for_kind` in
 * weeon-tenants/supabase/migrations/20261026180000_grade_wiring.sql.
 *
 * The ladder is implemented twice on purpose (publishing runs in TypeScript,
 * grading inside SQL). These cases are the contract: if either copy drifts, a
 * column can be filed by one path and not the other — which is exactly how the
 * "grades that never count toward FINAL" bug happened.
 * See docs/grade-wiring.md § 4 and § 9.
 */
describe("rubro ladder contract (SQL parity)", () => {
  it("reduces the five assignment kinds to the two rubro kinds", () => {
    expect(kindForRouting("homework")).toBe("homework");
    expect(kindForRouting("classwork")).toBe("homework");
    expect(kindForRouting("project")).toBe("homework");
    expect(kindForRouting("exam")).toBe("exam");
    expect(kindForRouting("quiz")).toBe("exam");
    // A column with no kind must route predictably rather than throw.
    expect(kindForRouting(null)).toBe("homework");
  });

  it("matches whole names only, in both directions", () => {
    expect(
      resolveRubroForKind(
        [
          rubro({ id: "t", name: "Tareas" }),
          rubro({ id: "e", name: "Exámenes", position: 1 }),
        ],
        "exam",
      )?.id,
    ).toBe("e");
    // Partial names must not be treated as the category.
    const decoys = [
      rubro({ id: "d1", name: "Repaso de examen" }),
      rubro({ id: "d2", name: "Entrega de tareas atrasadas", position: 1 }),
    ];
    expect(resolveRubroForKind(decoys, "exam")).toBeNull();
    expect(resolveRubroForKind(decoys, "homework")).toBeNull();
  });

  it("prefers the tag so a renamed rubro keeps working", () => {
    const rubric = [
      rubro({ id: "x", name: "Evaluaciones cortas", defaultKind: "exam" }),
      rubro({ id: "y", name: "Exámenes", position: 1 }),
    ];
    expect(resolveRubroForKind(rubric, "exam")?.id).toBe("x");
  });

  it("ignores archived rubros on both rungs", () => {
    const rubric = [
      { ...rubro({ id: "a", name: "Tareas" }), archived: true },
      rubro({ id: "b", name: "Trabajo en clase", position: 1 }),
    ];
    expect(resolveRubroForKind(rubric, "homework")?.id).toBe("b");
  });

  it("is tolerant of accents, case and padding, like the SQL normalize", () => {
    for (const name of [" examen ", "EXÁMENES", "Exámen", "examenes"]) {
      expect(resolveRubroForKind([rubro({ id: "e", name })], "exam")?.id).toBe("e");
    }
  });
});

describe("normalizeRubroName", () => {
  it("ignores case, accents and surrounding space", () => {
    expect(normalizeRubroName("  Exámenes ")).toBe("examenes");
    expect(normalizeRubroName("EVALUACIÓN")).toBe("evaluacion");
    expect(normalizeRubroName("Trabajos Prácticos")).toBe("trabajos practicos");
  });
});

describe("resolveRubroForKind", () => {
  it("prefers an explicit default_kind over the name", () => {
    const rubros = [
      rubro({ id: "a", name: "Exámenes", position: 0 }),
      rubro({ id: "b", name: "Pruebas cortas", defaultKind: "exam", position: 1 }),
    ];
    expect(resolveRubroForKind(rubros, "exam")?.id).toBe("b");
  });

  it("falls back to the rubro name when nothing is tagged", () => {
    const rubros = [
      rubro({ id: "t", name: "Tareas", position: 0 }),
      rubro({ id: "e", name: "Exámenes", position: 1 }),
    ];
    expect(resolveRubroForKind(rubros, "exam")?.id).toBe("e");
    expect(resolveRubroForKind(rubros, "homework")?.id).toBe("t");
  });

  it("never puts an exam in Tareas when only Tareas exists", () => {
    const rubros = [rubro({ id: "t", name: "Tareas", defaultKind: "homework" })];
    expect(resolveRubroForKind(rubros, "exam")).toBeNull();
  });

  it("returns null instead of guessing between unrelated rubros", () => {
    const rubros = [
      rubro({ id: "p", name: "Proyectos", position: 0 }),
      rubro({ id: "l", name: "Laboratorio", position: 1 }),
    ];
    expect(resolveRubroForKind(rubros, "exam")).toBeNull();
  });

  it("skips archived rubros", () => {
    const rubros = [
      { ...rubro({ id: "old", name: "Exámenes" }), archived: true },
      rubro({ id: "new", name: "Pruebas", defaultKind: "exam" }),
    ];
    expect(resolveRubroForKind(rubros, "exam")?.id).toBe("new");
  });

  it("prefers the lowest position among name matches", () => {
    const rubros = [
      rubro({ id: "z", name: "Exámenes", position: 5 }),
      rubro({ id: "a", name: "Examen", position: 1 }),
    ];
    expect(resolveRubroForKind(rubros, "exam")?.id).toBe("a");
  });

  it("matches the singular and plural forms teachers actually type", () => {
    for (const name of ["Tarea", "Tareas", "Trabajo", "Trabajos", "Trabajo en clase"]) {
      expect(resolveRubroForKind([rubro({ id: "x", name })], "homework")?.id).toBe("x");
    }
    for (const name of ["Examen", "Exámenes", "Prueba", "Pruebas", "Evaluación"]) {
      expect(resolveRubroForKind([rubro({ id: "x", name })], "exam")?.id).toBe("x");
    }
  });

  it("does not match a name that only contains the keyword", () => {
    const rubros = [rubro({ id: "x", name: "Repaso de examen" })];
    expect(resolveRubroForKind(rubros, "exam")).toBeNull();
  });
});
