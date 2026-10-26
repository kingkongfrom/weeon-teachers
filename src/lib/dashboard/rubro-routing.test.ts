import { describe, expect, it } from "vitest";
import { normalizeRubroName, resolveRubroForKind } from "./rubro-routing";

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
