"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Search,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { SEGMENT_TRACK, hubToneSegment } from "@/lib/dashboard/tones";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import {
  groupItemsByCollection,
  type LibraryCollection,
  type LibraryItem,
} from "@/lib/assessments/library";
import { filterLibraryItems, gradeLevelsIn } from "@/lib/assessments/library";
import {
  createLibraryCollection,
  deleteLibraryCollection,
  deleteLibraryItem,
  duplicateSharedItemToMine,
  moveLibraryItem,
  renameLibraryCollection,
  revokeLibraryShare,
  setLibraryItemArchived,
  shareLibraryItem,
} from "@/lib/teachers/library-actions";
import { fetchShareableTeachers } from "@/lib/teachers/library-client-actions";

type Tab = "mine" | "shared";

/**
 * Mis evaluaciones — the teacher's personal library.
 *
 * Two tabs (`Mías` / `Compartidas conmigo`) over one filtered list. Everything
 * that changes data goes through a server action and then `router.refresh()`
 * via the parent's `onChanged`, so the list always reflects the database.
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
  onChanged: () => void;
}) {
  const t = useT();
  const l = t.library;

  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  const [collectionDialog, setCollectionDialog] = useState<
    { mode: "create" } | { mode: "rename"; collection: LibraryCollection } | null
  >(null);
  const [collectionName, setCollectionName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LibraryItem | null>(null);
  const [collectionDelete, setCollectionDelete] = useState<LibraryCollection | null>(null);
  const [shareTarget, setShareTarget] = useState<LibraryItem | null>(null);

  const scoped = useMemo(
    () => items.filter((item) => (tab === "shared" ? item.shared : !item.shared)),
    [items, tab],
  );
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
    () => groupItemsByCollection(collections, visible),
    [collections, visible],
  );

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={cn(SEGMENT_TRACK, "w-fit")} role="tablist" aria-label={l.tabs.aria}>
          {(["mine", "shared"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                hubToneSegment(value === "mine" ? "purple" : "blue", tab === value),
              )}
            >
              {value === "mine" ? l.tabs.mine : l.tabs.shared}
              <span className="ml-1.5 text-xs font-bold tabular-nums opacity-60">
                {value === "mine"
                  ? items.filter((item) => !item.shared).length
                  : items.filter((item) => item.shared).length}
              </span>
            </button>
          ))}
        </div>
        {tab === "mine" ? (
          <button
            type="button"
            onClick={() => {
              setCollectionName("");
              setCollectionDialog({ mode: "create" });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
          >
            <FolderPlus className="h-4 w-4" />
            {l.newCollection}
          </button>
        ) : null}
      </div>

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
        <div className="flex items-center gap-2">
          <Dropdown
            value={subjectId}
            onChange={(value) => setSubjectId(value)}
            ariaLabel={l.subject}
            fitContent
            options={[
              { value: "", label: l.allSubjects },
              ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
            ]}
          />
          {levels.length > 1 ? (
            <Dropdown
              value={level}
              onChange={(value) => setLevel(value)}
              ariaLabel={l.gradeLevel}
              fitContent
              options={[
                { value: "", label: l.allLevels },
                ...levels.map((value) => ({ value, label: value })),
              ]}
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-error/40 bg-error/5 px-3 py-2 text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-foreground/40">
            {tab === "shared" ? (
              <Users className="h-6 w-6" />
            ) : (
              <FileText className="h-6 w-6" />
            )}
          </span>
          <p className="text-sm font-semibold text-foreground">
            {scoped.length === 0
              ? tab === "shared"
                ? l.emptyShared.title
                : l.empty.title
              : l.noResults}
          </p>
          {scoped.length === 0 ? (
            <p className="max-w-md text-sm text-foreground/55">
              {tab === "shared" ? l.emptyShared.body : l.empty.body}
            </p>
          ) : null}
          {scoped.length === 0 && tab === "mine" ? (
            <Link
              href="/aula-virtual"
              className="mt-1 inline-flex h-9 items-center rounded-full bg-[#0891B2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0e7490]"
            >
              {l.empty.action}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sections
            .filter((section) => section.items.length > 0 || section.collection != null)
            .map((section) => (
              <section key={section.collection?.id ?? "none"} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground/45">
                    <Folder className="h-3.5 w-3.5" />
                    {section.collection?.name ?? l.unfiled}
                  </h2>
                  {section.collection ? (
                    <div className="flex items-center gap-1">
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
                        className="flex h-7 w-7 items-center justify-center rounded text-foreground/40 hover:text-foreground"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollectionDelete(section.collection)}
                        aria-label={l.deleteCollection}
                        title={l.deleteCollection}
                        className="flex h-7 w-7 items-center justify-center rounded text-error/60 hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>

                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <ItemCard
                        item={item}
                        collections={collections}
                        busy={busyId === item.id}
                        onPreview={() => undefined}
                        onDuplicate={() =>
                          void run(item.id, () => duplicateSharedItemToMine({ itemId: item.id }))
                        }
                        onArchive={() =>
                          void run(item.id, () =>
                            setLibraryItemArchived({ id: item.id, archived: !item.archived }),
                          )
                        }
                        onDelete={() => setDeleteTarget(item)}
                        onShare={() => setShareTarget(item)}
                        onMove={(collectionId) =>
                          void run(item.id, () => moveLibraryItem({ id: item.id, collectionId }))
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      <Dialog
        open={collectionDialog !== null}
        title={
          collectionDialog?.mode === "rename" ? l.renameCollection : l.newCollection
        }
        onClose={() => setCollectionDialog(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCollectionDialog(null)}
              className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold text-foreground/65 hover:bg-surface-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => void submitCollection()}
              disabled={!collectionName.trim() || busyId === "collection"}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0891B2] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyId === "collection" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {collectionDialog?.mode === "rename" ? l.saveCollection : l.createCollection}
            </button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground/70">
          {l.collectionName}
          <input
            value={collectionName}
            onChange={(event) => setCollectionName(event.target.value)}
            placeholder={l.collectionPlaceholder}
            maxLength={80}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-brand-400"
          />
        </label>
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

      <ShareDialog
        item={shareTarget}
        onClose={() => setShareTarget(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function ItemCard({
  item,
  collections,
  busy,
  onDuplicate,
  onArchive,
  onDelete,
  onShare,
  onMove,
}: {
  item: LibraryItem;
  collections: LibraryCollection[];
  busy: boolean;
  onPreview: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: (collectionId: string | null) => void;
}) {
  const t = useT();
  const l = t.library;

  return (
    <article className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            item.kind === "exam"
              ? "bg-[#e6defb] text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]"
              : "bg-[#d9f2ef] text-[#0f4c47] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]",
          )}
        >
          {item.kind === "exam" ? l.kindExam : l.kindHomework}
        </span>
        <div className="flex items-center gap-1">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/40" /> : null}
          {item.shared ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
              <Users className="h-3 w-3" />
              {item.sharedByName || l.tabs.shared}
            </span>
          ) : (
            <CardMenu
              item={item}
              collections={collections}
              onArchive={onArchive}
              onDelete={onDelete}
              onShare={onShare}
              onMove={onMove}
            />
          )}
        </div>
      </div>

      <Link
        href={`/aula-virtual/mis-evaluaciones/${item.id}`}
        className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground hover:underline"
      >
        {item.title || "—"}
      </Link>

      <p className="text-xs font-medium text-foreground/50">
        {l.questions(item.questionCount)} · {l.points(item.pointsTotal)}
      </p>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-foreground/45">
        {item.subjectName ? <span>{item.subjectName}</span> : null}
        {item.gradeLevel ? <span>· {item.gradeLevel}</span> : null}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] font-semibold text-foreground/45">
          {item.shared ? l.usedIn(item.usedCount) : l.usedIn(item.usedCount)}
        </span>
        {item.shared ? (
          <button
            type="button"
            onClick={onDuplicate}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-bold text-foreground/70 hover:bg-surface-muted disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" />
            {l.duplicateShared}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function CardMenu({
  item,
  collections,
  onArchive,
  onDelete,
  onShare,
  onMove,
}: {
  item: LibraryItem;
  collections: LibraryCollection[];
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: (collectionId: string | null) => void;
}) {
  const t = useT();
  const l = t.library;
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={l.moveToCollection}
        className="flex h-7 w-7 items-center justify-center rounded text-foreground/40 hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-border bg-surface p-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onShare();
              }}
              className="menu-row"
            >
              <Share2 className="h-4 w-4" /> {l.share}
            </button>
            <div className="my-1 border-t border-border" />
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground/40">
              {l.moveToCollection}
            </p>
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onMove(collection.id);
                }}
                disabled={item.collectionId === collection.id}
                className="menu-row disabled:opacity-40"
              >
                <Folder className="h-4 w-4" /> {collection.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onMove(null);
              }}
              disabled={item.collectionId == null}
              className="menu-row disabled:opacity-40"
            >
              <Folder className="h-4 w-4" /> {l.noCollection}
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
              className="menu-row"
            >
              {item.archived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {item.archived ? l.unarchive : l.archive}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="menu-row text-error"
            >
              <Trash2 className="h-4 w-4" /> {l.delete}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ShareDialog({
  item,
  onClose,
  onChanged,
}: {
  item: LibraryItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useT();
  const l = t.library;
  const [teachers, setTeachers] = useState<
    Array<{ id: string; name: string; email: string | null; shared: boolean }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = item !== null;

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetchShareableTeachers({ itemId: item?.id ?? null });
    setLoading(false);
    if (!res.ok) {
      setError(l.shareLoadFailed);
      return;
    }
    setTeachers(res.teachers);
  }

  return (
    <Dialog
      open={open}
      title={l.shareTitle}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-full bg-[#0891B2] px-4 text-sm font-semibold text-white"
        >
          {t.common.close}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/60">{l.shareHint}</p>
        {!loading && teachers.length === 0 && !error ? (
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 w-fit items-center rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70"
          >
            {l.share}
          </button>
        ) : null}
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-foreground/40" /> : null}
        {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
        <ul className="flex flex-col gap-1">
          {teachers.map((teacher) => (
            <li
              key={teacher.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {teacher.name || teacher.email || "—"}
                </p>
                {teacher.email ? (
                  <p className="truncate text-xs text-foreground/45">{teacher.email}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    if (!item) return;
                    const ok = teacher.shared
                      ? await revokeLibraryShare({ itemId: item.id, teacherId: teacher.id })
                      : await shareLibraryItem({ itemId: item.id, teacherId: teacher.id });
                    if (ok.ok) {
                      setTeachers((current) =>
                        current.map((row) =>
                          row.id === teacher.id ? { ...row, shared: !row.shared } : row,
                        ),
                      );
                      onChanged();
                    }
                  })()
                }
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs font-bold",
                  teacher.shared
                    ? "border border-border text-foreground/60 hover:bg-surface-muted"
                    : "bg-[#0891B2] text-white hover:bg-[#0e7490]",
                )}
              >
                {teacher.shared ? l.unshare : l.share}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
