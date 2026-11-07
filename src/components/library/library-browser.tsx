"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookMarked,
  ClipboardCheck,
  FileText,
  Folder,
  FolderPlus,
  Gamepad2,
  Layers,
  Loader2,
  PencilLine,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import {
  DIALOG_CONTROL,
  Dialog,
  DialogField,
  DialogPrimary,
  DialogSecondary,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LibraryItemCard } from "@/components/library/library-item-card";
import { BlooketSetsList } from "@/components/blooket/blooket-sets-list";
import type { SavedBlooketSet } from "@/lib/teachers/blooket-actions";
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
  blookets = [],
  onChanged,
}: {
  collections: LibraryCollection[];
  items: LibraryItem[];
  subjects: { id: string; name: string }[];
  /** Saved Blooket sets, shown as their own collection under Mías. */
  blookets?: SavedBlooketSet[];
  /** Optional hook for hosts that manage their own refresh (class picker). */
  onChanged?: () => void;
}) {
  const t = useLiveT();
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
  /*
   * Subjects that ACTUALLY HAVE ITEMS in the current tab.
   *
   * The `subjects` prop is the school's whole catalogue (`loadSubjectOptions`),
   * so listing it offered filters that matched nothing. Derived from `scoped`
   * instead, and filtered against `subjects` only to get display names — an
   * item's own `subjectName` is the fallback when the catalogue has no entry.
   */
  const availableSubjects = useMemo(() => {
    const byId = new Map(subjects.map((subject) => [subject.id, subject.name]));
    const present = new Map<string, string>();
    for (const item of scoped) {
      if (!item.subjectId) continue;
      if (present.has(item.subjectId)) continue;
      present.set(item.subjectId, byId.get(item.subjectId) ?? item.subjectName ?? item.subjectId);
    }
    return [...present.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
  }, [scoped, subjects]);
  /*
   * Collections that actually HOLD something, in the current tab.
   *
   * The counts must agree with each other. `items` excludes archived rows, but
   * `collections` is every row in `exam_library_collections` — including empty
   * ones. Counting those produced a strip that said "1 colección" while showing
   * nothing inside it, so the number described the schema rather than the
   * teacher's library.
   *
   * Same rule as `availableSubjects`: count what the teacher can actually see.
   */
  const filledCollections = useMemo(() => {
    const ids = new Set<string>();
    for (const item of scoped) {
      if (item.collectionId) ids.add(item.collectionId);
    }
    return collections.filter((collection) => ids.has(collection.id));
  }, [scoped, collections]);
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
      {/*
       * ── HERO ──────────────────────────────────────────────────────────────
       *
       * The page had no identity: a page title, then six flat grey bands of
       * equal weight stacked to the first card. The hero gives it one — the
       * library's scale, against the brand gradient, with the create actions
       * living inside it. The toolbar below keeps only what NARROWS the list.
       *
       * `.brand-gradient` rather than a Tailwind from/to colour chain: brand
       * colours are CSS custom properties, and an opacity modifier on a var()
       * colour (`from-brand-start/95`) produces NO background at all — the hero
       * then renders white text on the white surface, which reads as a blank box.
       */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div aria-hidden className="brand-gradient pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
              {l.hero.eyebrow}
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-3xl font-bold leading-none tracking-tight text-white tabular-nums">
                {counts.mine + counts.shared}
              </p>
              <p className="text-[13.5px] font-medium text-white/75">
                {l.hero.total(counts.mine + counts.shared)}
              </p>
            </div>
            {/*
             * THE BREAKDOWN LIVES IN THE TOOLBAR, NOT HERE.
             *
             * It used to sit in both places, so the page printed the same four
             * numbers twice — and the copy here disagreed with the one below
             * (empty collections, and a "0 exámenes" the toolbar hid). The hero
             * keeps the headline; the toolbar keeps the detail, from the same
             * `filledCollections` / `scoped` in this one component.
             */}
          </div>

          {tab === "mine" ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {/* Entry point for /aula-virtual/blooket: the builder is a separate
                  page, and this repo has no sidebar to link it from.
                  No `backdrop-blur`: `backdrop-filter` inside an element with
                  absolutely-positioned siblings is a known iOS Safari rendering
                  hazard, and the frost was decoration. */}
              <Link
                href="/aula-virtual/blooket"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[12.5px] font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/25"
              >
                <Gamepad2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden md:inline">{l.blooketAction}</span>
                <span className="md:hidden">{l.blooketShort}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCollectionName("");
                  setCollectionDialog({ mode: "create" });
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-bold text-brand-700 shadow-sm transition-transform hover:-translate-y-px"
              >
                <FolderPlus className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden md:inline">{l.newCollection}</span>
                <span className="md:hidden">{l.newCollectionShort}</span>
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Toolbar: only the controls that NARROW the list. ─────────────── */}
      <div className="flex flex-col rounded-2xl border border-border bg-surface">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label={l.tabs.aria}
              className="inline-flex items-center gap-1 rounded-full bg-surface-muted p-1"
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
                        ? "bg-background text-foreground ring-1 ring-inset ring-border"
                        : "text-foreground/55 hover:text-foreground",
                    )}
                  >
                    <span className="sm:hidden">
                      {value === "mine" ? l.tabs.mine : l.tabs.sharedShort}
                    </span>
                    <span className="hidden sm:inline">
                      {value === "mine" ? l.tabs.mine : l.tabs.shared}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                        active
                          ? "bg-surface-muted text-foreground/70"
                          : "bg-background/70 text-foreground/45",
                      )}
                    >
                      {counts[value]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The two create actions live in the hero now, not here: this band
                is for narrowing. */}
          </div>

          {scoped.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative flex min-w-0 flex-1 items-center">
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-foreground/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={l.search}
                  aria-label={l.search}
                  className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-9 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow,background-color] focus:border-[#0891B2] focus:bg-background focus:shadow-[0_0_0_3px_rgb(8_145_178/0.12)]"
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
                {/*
                 * THE SUBJECT FILTER, WITH TWO GUARDS.
                 *
                 * 1. It only renders when there is something to CHOOSE between —
                 *    two or more distinct subjects among the items the teacher
                 *    actually has. With one subject it could only narrow to the
                 *    single result already on screen, so it disappears and the
                 *    search field takes the whole row.
                 *
                 * 2. It lists only subjects that HAVE ITEMS. `loadSubjectOptions()`
                 *    returns the whole school catalogue, so the old menu offered
                 *    filters that matched nothing — a dead end dressed as a choice.
                 */}
                {availableSubjects.length > 1 ? (
                  <SelectMenu
                    label={l.subject}
                    value={subjectId}
                    onChange={setSubjectId}
                    align="right"
                    options={[
                      { value: "", label: l.allSubjects },
                      ...availableSubjects.map((subject) => ({
                        value: subject.id,
                        label: subject.name,
                      })),
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
                    className="h-10 shrink-0 rounded-full px-2.5 text-[12.5px] font-semibold text-foreground/45 transition-colors hover:text-foreground"
                  >
                    {t.common.clearFilters}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {scoped.length > 0 ? (
            /*
             * THE ONE PLACE THE BREAKDOWN LIVES.
             *
             * Every number comes from the same `scoped` array the cards render,
             * and zero counts are omitted: "0 Exámenes" is not information, it
             * is a category that does not apply to this teacher yet.
             */
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 pt-2.5 text-[11.5px] font-semibold text-foreground/45">
              <CountChip
                icon={<Layers className="h-3.5 w-3.5" />}
                label={l.summary.assessments(scoped.length)}
              />
              {scoped.filter((item) => item.kind === "exam").length > 0 ? (
                <CountChip
                  icon={<ClipboardCheck className="h-3.5 w-3.5" />}
                  label={l.summary.exams}
                  value={scoped.filter((item) => item.kind === "exam").length}
                />
              ) : null}
              {scoped.filter((item) => item.kind !== "exam").length > 0 ? (
                <CountChip
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label={l.summary.homework}
                  value={scoped.filter((item) => item.kind !== "exam").length}
                />
              ) : null}
              {tab === "mine" && filledCollections.length > 0 ? (
                <CountChip
                  icon={<Folder className="h-3.5 w-3.5" />}
                  label={l.summary.collections(filledCollections.length)}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Saved Blooket sets are stored in their own table, not as library items
            (no points, no grading), so on the teacher's own tab they lead the list
            as a collection of their own: the only place outside the builder where
            a stored set is browsable, downloadable and reopened. Rendered even
            when empty — the empty card is the only thing that explains the
            collection exists at all. */}
        {tab === "mine" ? (
          <div className="border-t border-border px-4 py-3">
            <BlooketSetsList sets={blookets} onChanged={refresh} />
          </div>
        ) : null}
      </div>

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
              <header className="flex items-center gap-1.5">
                <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/45">
                  {section.collection ? (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-foreground/35" />
                  ) : (
                    <BookMarked className="h-3.5 w-3.5 shrink-0 text-foreground/35" />
                  )}
                  <span className="truncate">
                    {section.collection?.name ?? (tab === "shared" ? l.tabs.shared : l.unfiled)}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground/50">
                    {section.items.length}
                  </span>
                </h2>
                <span aria-hidden className="mx-1.5 h-px min-w-4 flex-1 bg-border" />
                {section.collection ? (
                  <div className="flex shrink-0 items-center gap-0.5">
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
                <p className="rounded-xl border border-dashed border-border px-3.5 py-4 text-[12.5px] font-medium text-foreground/40">
                  {l.emptyCollection}
                </p>
              ) : (
                <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
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
 * Small, quiet summary in the toolbar footer. Numbers are tabular so the chips
 * line up between tabs, and the value is optional — a collection count reads
 * fine as "3 colecciones" without repeating the digit.
 */
function CountChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-foreground/30">{icon}</span>
      {value === undefined ? null : (
        <span className="tabular-nums text-foreground/70">{value}</span>
      )}
      <span className="truncate">{label}</span>
    </span>
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
  const t = useLiveT();
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
