"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

/** A header pill: the rubro name and its weight, both edited in place. */
const PILL =
  "rounded-full bg-[#e6defb] text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]";

const PILL_INPUT =
  "rounded-full border border-brand-400 bg-background text-foreground outline-none ring-2 ring-brand-400/40";

/**
 * One rubro header in the gradebook matrix.
 *
 * Editing is in place — click the name or the weight, type, Enter/blur saves,
 * Esc cancels. There is no dialog: the header the teacher is looking at *is* the
 * form, which is what makes the weights feel like part of the table.
 *
 * `ariaBusy` marks a save already announced by the page; `onCommitName` /
 * `onCommitPeso` return `false` when the server refused, so the header can
 * restore the previous value and surface the error.
 */
export function RubroHeaderCell({
  name,
  peso,
  canManage,
  canDelete,
  pesoIncomplete,
  busy,
  onCommitName,
  onCommitPeso,
  onDelete,
  autoEdit,
  onAutoEditHandled,
  onDragStart,
}: {
  name: string | null;
  peso: number | null;
  canManage: boolean;
  canDelete: boolean;
  pesoIncomplete: boolean;
  busy: boolean;
  onCommitName: (name: string) => Promise<boolean>;
  onCommitPeso: (peso: number) => Promise<boolean>;
  onDelete: () => void;
  /** Opens a field without a click (right after "Nuevo rubro"). */
  autoEdit?: "name" | "peso" | null;
  /** Called once `autoEdit` was honoured, so the page can clear it. */
  onAutoEditHandled?: () => void;
  /** Starts a block drag; `null` when the header is not draggable. */
  onDragStart?: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const t = useT();
  const copy = t.gradebook.workspace.rubros;

  const [editing, setEditing] = useState<"name" | "peso" | null>(null);
  const [nameDraft, setNameDraft] = useState(name ?? "");
  const [pesoDraft, setPesoDraft] = useState(peso == null ? "" : String(peso));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const pesoRef = useRef<HTMLInputElement>(null);
  // A pointerup from the click that started the drag must not "click" a field.
  const draggedRef = useRef(false);
  // The header may be remounted under another block key (same rubro in two
  // blocks) or renamed elsewhere; an open draft must follow the saved value.
  const [shown, setShown] = useState({ name, peso });
  if (shown.name !== name || shown.peso !== peso) {
    setShown({ name, peso });
    setNameDraft(name ?? "");
    setPesoDraft(peso == null ? "" : String(peso));
  }

  // Opened by the page (after "Nuevo rubro"): adopt the request during render so
  // the field opens in the same paint, then tell the page once from an effect.
  const [handledAuto, setHandledAuto] = useState<"name" | "peso" | null>(null);
  if (autoEdit && handledAuto !== autoEdit && editing == null) {
    setHandledAuto(autoEdit);
    setNameDraft(name ?? "");
    setPesoDraft(peso == null ? "" : String(peso));
    setEditing(autoEdit);
    setError(null);
  }

  useEffect(() => {
    if (autoEdit) onAutoEditHandled?.();
  }, [autoEdit, onAutoEditHandled]);

  useEffect(() => {
    if (editing === "name") {
      nameRef.current?.focus();
      nameRef.current?.select();
    } else if (editing === "peso") {
      pesoRef.current?.focus();
      pesoRef.current?.select();
    }
  }, [editing]);


  function startEditing(field: "name" | "peso") {
    if (!canManage || draggedRef.current) return;
    setError(null);
    if (field === "name") setNameDraft(name ?? "");
    else setPesoDraft(peso == null ? "" : String(peso));
    setEditing(field);
  }

  async function commitName() {
    if (saving) return;
    const next = nameDraft.trim();
    if (!name || next === name) {
      setEditing(null);
      setError(null);
      return;
    }
    if (!next) {
      setError(copy.name);
      return;
    }
    setSaving(true);
    const ok = await onCommitName(next);
    setSaving(false);
    setEditing(null);
    if (!ok) {
      setError(copy.name);
      setNameDraft(name);
    }
  }

  async function commitPeso() {
    if (saving) return;
    const raw = pesoDraft.trim();
    const next = raw === "" ? 0 : Number(raw);
    if (!Number.isInteger(next) || next < 0 || next > 100) {
      setError(copy.pesoInvalid);
      return;
    }
    if (peso != null && next === peso) {
      setEditing(null);
      setError(null);
      return;
    }
    setSaving(true);
    const ok = await onCommitPeso(next);
    setSaving(false);
    setEditing(null);
    if (!ok) {
      setError(copy.pesoInvalid);
      setPesoDraft(peso == null ? "" : String(peso));
    }
  }

  const pending = busy || saving;

  return (
    <div
      className={cn(
        "group/rubro flex min-w-0 items-center justify-center gap-1",
        error != null && "ring-2 ring-error/50",
      )}
      title={error ?? undefined}
    >
      {onDragStart ? (
        <button
          type="button"
          onPointerDown={(event) => {
            draggedRef.current = true;
            window.setTimeout(() => {
              draggedRef.current = false;
            }, 300);
            onDragStart(event);
          }}
          aria-label={copy.dragHandle}
          title={copy.dragRubroHint}
          className="-ml-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-foreground/30 hover:text-foreground/60 active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {editing === "name" ? (
        <input
          ref={nameRef}
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={() => void commitName()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitName();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setNameDraft(name ?? "");
              setError(null);
              setEditing(null);
            }
          }}
          maxLength={60}
          disabled={pending}
          aria-label={copy.editName}
          placeholder={copy.name}
          className={cn(
            "min-w-0 max-w-[8rem] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
            PILL,
            PILL_INPUT,
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() => startEditing("name")}
          disabled={!canManage}
          aria-label={`${name ?? copy.noRubro} · ${copy.editName}`}
          title={canManage ? copy.editName : undefined}
          className={cn(
            "max-w-[8rem] truncate px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
            "rounded hover:bg-surface-muted",
            canManage
              ? "cursor-text hover:ring-1 hover:ring-brand-400/40"
              : "cursor-default",
          )}
        >
          {name ?? copy.noRubro}
        </button>
      )}

      {editing === "peso" ? (
        <input
          ref={pesoRef}
          value={pesoDraft}
          onChange={(event) => setPesoDraft(event.target.value.replace(/[^\d]/g, ""))}
          onBlur={() => void commitPeso()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitPeso();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setPesoDraft(peso == null ? "" : String(peso));
              setError(null);
              setEditing(null);
            }
          }}
          inputMode="numeric"
          maxLength={3}
          disabled={pending}
          aria-label={copy.editPeso}
          title={copy.pesoHelp}
          className={cn(
            "w-11 shrink-0 px-1 py-0.5 text-center text-[10px] font-bold tabular-nums",
            PILL,
            PILL_INPUT,
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() => startEditing("peso")}
          disabled={!canManage}
          aria-label={`${copy.editPeso} · ${peso ?? 0}%`}
          title={canManage ? copy.pesoHelp : undefined}
          className={cn(
            "shrink-0 px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition-colors",
            PILL,
            canManage ? "cursor-text hover:ring-1 hover:ring-brand-400/60" : "cursor-default",
            pesoIncomplete && "ring-1 ring-[#f5d88a] dark:ring-[#5b4318]",
          )}
        >
          {peso == null ? copy.weightPlaceholder : `${peso}%`}
        </button>
      )}

      {pending ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-foreground/40" />
      ) : null}

      {!editing && error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}

      {canManage && !editing ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete || pending}
          aria-label={copy.delete}
          title={canDelete ? copy.delete : copy.hasColumns}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-error/60 opacity-0 transition-opacity hover:text-error focus-visible:opacity-100 group-hover/rubro:opacity-100 disabled:opacity-0"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
