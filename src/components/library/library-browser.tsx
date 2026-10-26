"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookMarked,
  Folder,
  FolderPlus,
  Loader2,
  PencilLine,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import {
  DIALOG_CONTROL,
  Dialog,
  DialogField,
  DialogPrimary,
  DialogSecondary,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LibraryItemCard } from "@/components/library/library-item-card";
import { SelectMenu } from "@/components/ui/select-menu";
import { ShareLibraryDialog } from "@/components/library/share-library-dialog";
import {
  filterLibraryItems,
  gradeLevelsIn,
  groupItemsByCollection,
  type LibraryCollection,
  type LibraryItem,
} from "@/lib/assessments/library";
import {
  createLibraryCollection,
  deleteLibraryCollection,
  deleteLibraryItem,
  duplicateSharedItemToMine,
  moveLibraryItem,
  renameLibraryCollection,
  setLibraryItemArchived,
} from "@/lib/teachers/library-actions";

type Tab = "mine" | "shared";

/**
 * Mis evaluaciones — the teacher's personal library.
 *
 * Two tabs over one filtered list. Every write goes through a server action and
 * then `router.refresh()`, so the list always reflects the database.
 */
export function LibraryBrowser({
  collections,
  items,
  subjects,
  onChanged,
}: {
  collections: LibraryCollection[];
  items: LibraryItem[];
  subjects: { id: string; name: string }[];
  /** Optional hook for hosts that manage their own refresh (class picker). */
  onChanged?: () => void;
}) {
  const t = useT();
  const l = t.library;
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [collectionDialog, setCollectionDialog] = useState<
    { mode: "create" } | { mode: "rename"; collection: LibraryCollection } | null
  >(null);
  const [collectionName, setCollectionName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LibraryItem | null>(null);
  const [collectionDelete, setCollectionDelete] = useState<LibraryCollection | null>(null);
  const [shareTarget, setShareTarget] = useState<LibraryItem | null>(null);

  const mine = useMemo(() => items.filter((item) => !item.shared), [items]);
  const shared = useMemo(() => items.filter((item) => item.shared), [items]);
  const scoped = tab === "mine" ? mine : shared;

  const levels = useMemo(() => gradeLevelsIn(scoped), [scoped]);
  const visible = useMemo(
    () =>
      filterLibraryItems(scoped, query, {
        subjectId: subjectId || null,
        gradeLevel: level || null,
      }),
    [scoped, query, subjectId, level],
  );
  const sections = useMemo(
    () =>
      tab === "mine"
        ? groupItemsByCollection(collections, visible)
        : [{ collection: null, items: visible }],
    [tab, collections, visible],
  );

  const activeFilters = (subjectId ? 1 : 0) + (level ? 1 : 0);

  function refresh() {
    router.refresh();
    onChanged?.();
  }

  async function run(
    id: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
  ): Promise<boolean> {
    setBusyId(id);
    setError(null);
    const res = await action();
    setBusyId(null);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return false;
    }
    refresh();
    return true;
  }

  async function submitCollection() {
    const name = collectionName.trim();
    if (!name || !collectionDialog) return;
    const ok =
      collectionDialog.mode === "create"
        ? await run("collection", () => createLibraryCollection({ name }))
        : await run("collection", () =>
            renameLibraryCollection({ id: collectionDialog.collection.id, name }),
          );
    if (ok) {
      setCollectionDialog(null);
      setCollectionName("");
    }
  }

  const counts = { mine: mine.length, shared: shared.length };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Tabs + primary action ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={l.tabs.aria}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1"
        >
          {(["mine", "shared"] as const).map((value) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-foreground/60 hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {value === "mine" ? l.tabs.mine : l.tabs.shared}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                    active ? "bg-background/20" : "bg-surface-muted text-foreground/50",
                  )}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>

        {tab === "mine" ? (
          <button
            type="button"
            onClick={() => {
              setCollectionName("");
              setCollectionDialog({ mode: "create" });
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <FolderPlus className="h-4 w-4" />
            {l.newCollection}
          </button>
        ) : null}
      </div>

      {/* ── Search + filters ──────────────────────────────────────────────── */}
      {scoped.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-foreground/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={l.search}
              aria-label={l.search}
              className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-9 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-[#0891B2] focus:bg-background focus:shadow-[0_0_0_3px_rgb(8_145_178/0.12)]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t.common.cancel}
                className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-foreground/35 hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="flex items-center gap-2">
            {subjects.length > 1 ? (
              <SelectMenu
                label={l.subject}
                value={subjectId}
                onChange={setSubjectId}
                align="right"
                options={[
                  { value: "", label: l.allSubjects },
                  ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
                ]}
              />
            ) : null}
            {levels.length > 1 ? (
              <SelectMenu
                label={l.gradeLevel}
                value={level}
                onChange={setLevel}
                align="right"
                options={[
                  { value: "", label: l.allLevels },
                  ...levels.map((value) => ({ value, label: value })),
                ]}
              />
            ) : null}
            {activeFilters > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSubjectId("");
                  setLevel("");
                }}
                className="h-10 rounded-full px-2.5 text-[12.5px] font-semibold text-foreground/45 transition-colors hover:text-foreground"
              >
                {t.common.clearFilters}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-error/25 bg-error/5 px-3.5 py-2.5 text-[13px] font-medium text-error"
        >
          {error}
        </p>
      ) : null}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <EmptyState
          tab={tab}
          hasItems={scoped.length > 0}
          filtered={activeFilters > 0 || query.trim().length > 0}
          onClearFilters={() => {
            setQuery("");
            setSubjectId("");
            setLevel("");
          }}
        />
      ) : (
        <div className="flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.collection?.id ?? "loose"} className="flex flex-col gap-3">
              <header className="flex items-center gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/40">
                  {section.collection ? (
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <BookMarked className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {section.collection?.name ?? (tab === "shared" ? l.tabs.shared : l.unfiled)}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-muted px-1.5 text-[10px] font-bold tabular-nums text-foreground/45">
                    {section.items.length}
                  </span>
                </h2>
                {section.collection ? (
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCollectionName(section.collection!.name);
                        setCollectionDialog({
                          mode: "rename",
                          collection: section.collection!,
                        });
                      }}
                      aria-label={l.renameCollection}
                      title={l.renameCollection}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/30 transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionDelete(section.collection)}
                      aria-label={l.deleteCollection}
                      title={l.deleteCollection}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/30 transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </header>

              {section.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-[12.5px] font-medium text-foreground/40">
                  {l.emptyCollection}
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <LibraryItemCard
                        item={item}
                        collections={collections}
                        busy={busyId === item.id}
                        onDuplicate={() =>
                          void run(item.id, () =>
                            duplicateSharedItemToMine({ itemId: item.id }),
                          )
                        }
                        onArchive={() =>
                          void run(item.id, () =>
                            setLibraryItemArchived({
                              id: item.id,
                              archived: !item.archived,
                            }),
                          )
                        }
                        onDelete={() => setDeleteTarget(item)}
                        onShare={() => setShareTarget(item)}
                        onMove={(collectionId) =>
                          void run(item.id, () =>
                            moveLibraryItem({ id: item.id, collectionId }),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <Dialog
        open={collectionDialog !== null}
        title={
          collectionDialog?.mode === "rename" ? l.renameCollection : l.newCollection
        }
        description={l.collectionDialogHint}
        icon={<Folder className="h-[18px] w-[18px]" strokeWidth={2.1} />}
        onClose={() => setCollectionDialog(null)}
        footer={
          <>
            <DialogSecondary onClick={() => setCollectionDialog(null)}>
              {t.common.cancel}
            </DialogSecondary>
            <DialogPrimary
              onClick={() => void submitCollection()}
              disabled={!collectionName.trim() || busyId === "collection"}
            >
              {busyId === "collection" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {collectionDialog?.mode === "rename" ? l.saveCollection : l.createCollection}
            </DialogPrimary>
          </>
        }
      >
        <DialogField label={l.collectionName}>
          <div className={DIALOG_CONTROL}>
            <input
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitCollection();
                }
              }}
              placeholder={l.collectionPlaceholder}
              maxLength={80}
              className="h-11 w-full min-w-0 border-0 bg-transparent px-3.5 text-[15px] font-medium text-foreground outline-none"
            />
          </div>
        </DialogField>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={l.deleteConfirm}
        description={deleteTarget?.title}
        confirmLabel={l.delete}
        cancelLabel={t.common.cancel}
        destructive
        pending={busyId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void (async () => {
            const ok = await run(deleteTarget.id, () =>
              deleteLibraryItem({ id: deleteTarget.id }),
            );
            if (ok) setDeleteTarget(null);
          })();
        }}
      />

      <ConfirmDialog
        open={collectionDelete !== null}
        title={l.deleteCollectionConfirm}
        description={collectionDelete?.name}
        confirmLabel={l.deleteCollection}
        cancelLabel={t.common.cancel}
        destructive
        pending={busyId === "collection"}
        onCancel={() => setCollectionDelete(null)}
        onConfirm={() => {
          if (!collectionDelete) return;
          void (async () => {
            const ok = await run("collection", () =>
              deleteLibraryCollection({ id: collectionDelete.id }),
            );
            if (ok) setCollectionDelete(null);
          })();
        }}
      />

      <ShareLibraryDialog
        item={shareTarget}
        onClose={() => setShareTarget(null)}
        onChanged={refresh}
      />
    </div>
  );
}

/**
 * Empty states are three different situations and deserve three different
 * answers: nothing saved yet (teach the flow), nothing shared with me (explain
 * the mechanism), and filters hid everything (offer the way back).
 */
function EmptyState({
  tab,
  hasItems,
  filtered,
  onClearFilters,
}: {
  tab: Tab;
  hasItems: boolean;
  filtered: boolean;
  onClearFilters: () => void;
}) {
  const t = useT();
  const l = t.library;

  if (hasItems && filtered) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-foreground/35">
          <Search className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">{l.noResults}</p>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-[13px] font-semibold text-[#0891B2] hover:underline"
        >
          {l.clearSearch}
        </button>
      </div>
    );
  }

  const title = tab === "shared" ? l.emptyShared.title : l.empty.title;
  const body = tab === "shared" ? l.emptyShared.body : l.empty.body;

  return (
    <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900">
        {tab === "shared" ? <Users className="h-6 w-6" /> : <BookMarked className="h-6 w-6" />}
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        <p className="text-[13px] leading-relaxed text-foreground/50">{body}</p>
      </div>
      {tab === "mine" ? (
        <>
          <Link
            href="/aula-virtual"
            className="mt-1 inline-flex h-10 items-center rounded-full bg-[#0891B2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0e7490]"
          >
            {l.empty.action}
          </Link>
          <p className="max-w-md text-[11.5px] leading-relaxed text-foreground/35">
            {l.seedHint}
          </p>
        </>
      ) : null}
    </div>
  );
}
