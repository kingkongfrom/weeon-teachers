/**
 * Which rubro a newly created grade column belongs to.
 *
 * Before this module the Aula Virtual publish path always took the **first**
 * active rubro of the class + subject, so an exam published into a rubric like
 * `Tareas 25% / Exámenes 40%` landed inside **Tareas** and quietly changed the
 * weighted final. Teachers never saw a wrong number, only a wrong one.
 *
 * The rule is conservative on purpose: use an explicit tag, then a name the
 * teacher clearly wrote for that kind, and otherwise return `null` so the column
 * is created **unassigned** (visible under "Sin rubro", one click to move).
 * Guessing is worse than asking.
 *
 * Pure: no React, no Supabase. Unit tests in `rubro-routing.test.ts`.
 */

export type RubroKind = "homework" | "exam";

export type RoutableRubro = {
  id: string;
  name: string;
  position: number;
  archived: boolean;
  /** `grade_rubros.default_kind` (nullable; null = not tagged). */
  defaultKind?: RubroKind | null;
};

/** Lowercase, accent-free, single-spaced — the form teachers type. */
export function normalizeRubroName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const NAMES_BY_KIND: Record<RubroKind, string[]> = {
  homework: ["tareas", "tarea", "trabajos", "trabajo", "trabajo en clase"],
  exam: ["examenes", "examen", "pruebas", "prueba", "evaluaciones", "evaluacion"],
};

/**
 * The rubro for a column of `kind`, or `null` when the rubric offers no honest
 * match. Archived rubros are ignored: a column must not land in a hidden group.
 */
export function resolveRubroForKind<T extends RoutableRubro>(
  rubros: T[],
  kind: RubroKind,
): T | null {
  const live = rubros.filter((rubro) => !rubro.archived);

  const tagged = live
    .filter((rubro) => rubro.defaultKind === kind)
    .sort((a, b) => a.position - b.position);
  if (tagged.length > 0) return tagged[0];

  // A teacher who created a rubro named for the kind means it; match the whole
  // name (not a substring) so "Repaso de examen" stays unassigned.
  const names = NAMES_BY_KIND[kind];
  const named = live
    .filter((rubro) => names.includes(normalizeRubroName(rubro.name)))
    .sort((a, b) => a.position - b.position);
  return named[0] ?? null;
}

/**
 * Whether the column should say so out loud: a rubric that has rubros at all
 * but none matching the kind means the teacher should pick one, rather than the
 * column disappearing quietly under "Sin rubro" and being forgotten.
 */
export function needsRubroChoice(rubros: RoutableRubro[], kind: RubroKind): boolean {
  if (rubros.length === 0) return false;
  return resolveRubroForKind(rubros, kind) == null;
}
