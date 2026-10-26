"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Loader2, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { filterLibraryItems, type LibraryItem } from "@/lib/assessments/library";
import { loadLibraryForPicker } from "@/lib/teachers/library-picker-actions";
import {
  suggestedRubroForClass,
  // Aliased: the linter treats any `use…` identifier called from a handler as
  // a React hook. This is a server action, not a hook.
  useLibraryItemInClass as copyLibraryItemToClass,
} from "@/lib/teachers/library-actions";

/**
 * "Desde mis evaluaciones…" — pick a saved assessment and copy it into this
 * class as a draft.
 *
 * The destination rubro is resolved **before** the teacher commits, so
 * publishing later never surprises them with a column in the wrong category
 * (§3.5 of the design). Nothing is copied until "Usar en esta clase".
 */
export function LibraryPickerDialog({
  open,
  classId,
  subjectId,
  onClose,
}: {
  open: boolean;
  classId: string;
  subjectId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const l = t.library;
  const router = useRouter();

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rubros, setRubros] = useState<
    Record<string, { name: string; peso: number } | null>
  >({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setQuery("");
    void loadLibraryForPicker().then((res) => {
      setItems(res.items);
      setLoading(false);
    });
  }, [open]);

  // Where each kind would land, so the card can say it.
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [homework, exam] = await Promise.all([
        suggestedRubroForClass({ classId, subjectId, kind: "homework" }),
        suggestedRubroForClass({ classId, subjectId, kind: "exam" }),
      ]);
      setRubros({ homework, exam });
    })();
  }, [open, classId, subjectId]);

  const levels = useMemo(() => {
    const values = new Set(
      items.map((item) => item.gradeLevel?.trim()).filter((v): v is string => Boolean(v)),
    );
    return [...values].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [items]);

  const visible = useMemo(
    () => filterLibraryItems(items, query, { gradeLevel: level || null }),
    [items, query, level],
  );

  async function startUsing(item: LibraryItem) {
    setPendingId(item.id);
    setError(null);
    const res = await copyLibraryItemToClass({ itemId: item.id, classId });
    setPendingId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  function destination(item: LibraryItem): string {
    const rubro = rubros[item.kind];
    return rubro ? l.useHint(rubro.name, rubro.peso) : l.useHintUnassigned;
  }

  return (
    <Dialog open={open} title={l.title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={l.search}
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand-400"
            />
          </label>
          {levels.length > 1 ? (
            <Dropdown
              value={level}
              onChange={setLevel}
              ariaLabel={l.gradeLevel}
              fitContent
              options={[
                { value: "", label: l.allLevels },
                ...levels.map((value) => ({ value, label: value })),
              ]}
            />
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-5 py-10 text-center">
            <FileText className="h-6 w-6 text-foreground/30" />
            <p className="text-sm font-semibold text-foreground">
              {items.length === 0 ? l.empty.title : l.noResults}
            </p>
            {items.length === 0 ? (
              <p className="max-w-sm text-sm text-foreground/55">{l.empty.body}</p>
            ) : null}
          </div>
        ) : (
          <ul className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
            {visible.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1.5 rounded-2xl border border-border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.title || "—"}
                    </p>
                    <p className="text-xs font-medium text-foreground/50">
                      {l.questions(item.questionCount)} · {l.points(item.pointsTotal)}
                      {item.subjectName ? ` · ${item.subjectName}` : ""}
                      {item.gradeLevel ? ` · ${item.gradeLevel}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      item.kind === "exam"
                        ? "bg-[#e6defb] text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]"
                        : "bg-[#d9f2ef] text-[#0f4c47] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]",
                    )}
                  >
                    {item.kind === "exam" ? l.kindExam : l.kindHomework}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-foreground/45">
                    {destination(item)}
                    {item.shared ? (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-foreground/40">
                        <Users className="h-3 w-3" />
                        {l.tabs.shared}
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => void startUsing(item)}
                    disabled={pendingId !== null}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#0891B2] px-3 text-xs font-bold text-white transition-colors hover:bg-[#0e7490] disabled:opacity-50"
                  >
                    {pendingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {pendingId === item.id ? l.useStarted : l.useInClass}
                    {pendingId === item.id ? null : <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
