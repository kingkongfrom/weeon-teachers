"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import {
  fullName,
  finalScoreStatus,
  type StudentGroupScore,
} from "@/lib/dashboard/student-summary";
import { loadMoreStudents } from "@/lib/teachers/students-actions";
import { Dropdown } from "@/components/ui/dropdown";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  grade: string | null;
  groups: StudentGroupScore[];
};

const BADGE_TONES: Record<string, string> = {
  excellent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  passed: "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300",
  "at-risk": "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  none: "bg-surface-muted text-foreground/50",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todo" },
  { value: "excellent", label: "Excelente" },
  { value: "passed", label: "Aprobado" },
  { value: "at-risk", label: "En riesgo" },
  { value: "none", label: "Sin notas" },
];

export function StudentsTable({
  students: initialStudents,
  total,
  pageSize = 20,
}: {
  students: StudentRow[];
  total: number;
  pageSize?: number;
}) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const hasMore = students.length < total;

  async function handleLoadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const result = await loadMoreStudents({ limit: pageSize, offset: students.length });
      setStudents((current) => {
        const seen = new Set(current.map((s) => s.id));
        return [...current, ...result.students.filter((s) => !seen.has(s.id))];
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const groupOptions = useMemo(() => {
    const names = new Set<string>();
    for (const student of students) {
      for (const group of student.groups) names.add(group.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "es"));
  }, [students]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .map((student) => {
        const groups = student.groups.filter((group) => {
          const matchesGroup = groupFilter === "all" || group.name === groupFilter;
          const matchesStatus =
            statusFilter === "all" || finalScoreStatus(group.finalScore).tone === statusFilter;
          return matchesGroup && matchesStatus;
        });
        return { student, groups };
      })
      .filter(({ student, groups }) => {
        if (q && !fullName(student).toLowerCase().includes(q)) return false;
        return student.groups.length === 0 || groups.length > 0;
      });
  }, [students, query, groupFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex w-64 max-w-full items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar estudiante…"
            aria-label="Buscar estudiante"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </label>

        <Dropdown
          value={groupFilter}
          onChange={setGroupFilter}
          ariaLabel="Filtrar por grupo"
          placeholder="Todos los grupos"
          options={[
            { value: "all", label: "Todos los grupos" },
            ...groupOptions.map((name) => ({ value: name, label: name })),
          ]}
        />

        <Dropdown
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel="Filtrar por estado"
          placeholder="Todo"
          options={STATUS_OPTIONS}
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">
            No hay estudiantes que coincidan con los filtros.
          </p>
        </div>
      ) : (
        <div className="max-w-fit overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-foreground/50">
                <th className="w-12 px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Estudiante</th>
                <th className="px-4 py-3 font-medium">Grupo</th>
                <th className="px-4 py-3 text-right font-medium">Nota</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map(({ student, groups }, index) => {
                const rowGroups = groups.length > 0 ? groups : null;
                const rowSpan = rowGroups ? rowGroups.length : 1;
                const groupRows = rowGroups ? rowGroups : [null];
                return groupRows.map((group, groupIndex) => {
                  const firstRow = groupIndex === 0;
                  return (
                    <tr
                      key={firstRow ? student.id : `${student.id}-${group?.id}`}
                      className={index % 2 === 1 ? "bg-surface-muted/30" : undefined}
                    >
                      {firstRow ? (
                        <td
                          rowSpan={rowSpan}
                          className="px-4 py-3 align-top tabular-nums text-xs text-foreground/50"
                        >
                          {index + 1}
                        </td>
                      ) : null}
                      {firstRow ? (
                        <td rowSpan={rowSpan} className="px-4 py-3 align-top">
                          <Link
                            href={`/estudiantes/${student.id}`}
                            className="font-medium text-foreground transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                          >
                            {fullName(student)}
                          </Link>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 align-top text-foreground/60">
                        {group ? group.name : "—"}
                      </td>
                      <td className="px-4 py-3 text-right align-top tabular-nums font-bold text-foreground">
                        {group
                          ? group.finalScore === null
                            ? "–"
                            : `${Math.round(group.finalScore)}%`
                          : "–"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {group ? (
                          (() => {
                            const status = finalScoreStatus(group.finalScore);
                            return (
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE_TONES[status.tone]}`}
                              >
                                {status.label}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-foreground/45">Sin grupos</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>

          {hasMore ? (
            <div className="flex items-center justify-center border-t border-border/70 px-4 py-3">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-950/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
              >
                {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loadingMore ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {loadError ? (
        <p className="text-center text-xs font-medium text-error">
          No se pudieron cargar más estudiantes. Inténtalo de nuevo.
        </p>
      ) : null}
    </div>
  );
}
