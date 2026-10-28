"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, Share2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import {
  DIALOG_CONTROL,
  Dialog,
  DialogPrimary,
} from "@/components/ui/dialog";
import type { LibraryItem } from "@/lib/assessments/library";
import { revokeLibraryShare, shareLibraryItem } from "@/lib/teachers/library-actions";
import { fetchShareableTeachers } from "@/lib/teachers/library-client-actions";

type Teacher = { id: string; name: string; email: string | null; shared: boolean };

/**
 * Share one library item with colleagues.
 *
 * The list is loaded on open (not at page load): it is a profile scan, and most
 * visits to the library never share anything. Toggling a teacher is optimistic
 * and reversible — the row swaps between "Compartir" and "Quitar acceso"
 * without a modal or a confirm, because granting and revoking are both cheap.
 */
export function ShareLibraryDialog({
  item,
  onClose,
  onChanged,
}: {
  item: LibraryItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useLiveT();
  const l = t.library;

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const open = item !== null;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(null);
    setLoading(true);
    void fetchShareableTeachers({ itemId: item?.id ?? null }).then((res) => {
      setLoading(false);
      if (!res.ok) {
        setError(l.shareLoadFailed);
        return;
      }
      setTeachers(res.teachers);
    });
    // `l.shareLoadFailed` is stable per dictionary; item.id is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = [...teachers].sort(
      (a, b) => Number(b.shared) - Number(a.shared) || a.name.localeCompare(b.name, "es"),
    );
    if (!needle) return sorted;
    return sorted.filter((teacher) =>
      `${teacher.name} ${teacher.email ?? ""}`.toLowerCase().includes(needle),
    );
  }, [teachers, query]);

  const sharedCount = teachers.filter((teacher) => teacher.shared).length;

  async function toggle(teacher: Teacher) {
    if (!item) return;
    setBusyId(teacher.id);
    setTeachers((current) =>
      current.map((row) =>
        row.id === teacher.id ? { ...row, shared: !row.shared } : row,
      ),
    );
    const res = teacher.shared
      ? await revokeLibraryShare({ itemId: item.id, teacherId: teacher.id })
      : await shareLibraryItem({ itemId: item.id, teacherId: teacher.id });
    setBusyId(null);
    if (!res.ok) {
      setTeachers((current) =>
        current.map((row) =>
          row.id === teacher.id ? { ...row, shared: teacher.shared } : row,
        ),
      );
      setError(res.error ?? l.shareLoadFailed);
      return;
    }
    onChanged();
  }

  return (
    <Dialog
      open={open}
      title={l.shareTitle}
      description={l.shareHint}
      icon={<Share2 className="h-[17px] w-[17px]" strokeWidth={2.1} />}
      onClose={onClose}
      footer={
        <DialogPrimary onClick={onClose} className="w-full sm:w-auto">
          {t.common.close}
        </DialogPrimary>
      }
    >
      <div className="flex flex-col gap-3.5">
        {item ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-surface-muted/60 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
              {item.title}
            </span>
            {sharedCount > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#0e7490] dark:text-[#22d3ee]">
                <Users className="h-3 w-3" />
                {sharedCount}
              </span>
            ) : null}
          </div>
        ) : null}

        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-foreground/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={l.searchTeachers}
            aria-label={l.searchTeachers}
            className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-9 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-[#0891B2] focus:shadow-[0_0_0_3px_rgb(8_145_178/0.12)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t.common.cancel}
              className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-foreground/35 hover:bg-surface-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/35" />
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13px] font-medium text-foreground/45">
            {teachers.length === 0 ? l.shareEmpty : l.noTeachersMatch}
          </p>
        ) : (
          <ul
            className={cn(
              "flex max-h-[42vh] flex-col gap-1 overflow-y-auto",
              DIALOG_CONTROL.replace("flex items-center", ""),
              "border-0 bg-transparent p-0 shadow-none focus-within:shadow-none",
            )}
          >
            {visible.map((teacher) => (
              <li
                key={teacher.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors",
                  teacher.shared
                    ? "border-[#0891B2]/30 bg-[#0891B2]/[0.05]"
                    : "border-border",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[12px] font-bold uppercase text-foreground/55">
                  {(teacher.name || teacher.email || "?").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {teacher.name || teacher.email || "—"}
                  </p>
                  {teacher.email ? (
                    <p className="truncate text-[11.5px] text-foreground/45">
                      {teacher.email}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void toggle(teacher)}
                  disabled={busyId === teacher.id}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[11.5px] font-bold transition-colors",
                    teacher.shared
                      ? "text-foreground/55 hover:bg-error/10 hover:text-error"
                      : "bg-[#0891B2] text-white hover:bg-[#0e7490]",
                  )}
                >
                  {busyId === teacher.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : teacher.shared ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                  {teacher.shared ? l.unshare : l.shareAction}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-error/25 bg-error/5 px-3 py-2 text-[12.5px] font-medium text-error"
          >
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
