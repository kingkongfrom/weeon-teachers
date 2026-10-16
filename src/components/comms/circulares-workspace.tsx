"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, GripVertical, Plus, Search, Trash2, X } from "lucide-react";
import { CircularPreviewPane } from "@/components/comms/circular-preview-pane";
import { NewCategoryDialog } from "@/components/comms/new-category-dialog";
import { PublishCircularDialog } from "@/components/comms/publish-circular-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import type {
  CircularCategory,
  TeacherCircularDetail,
  TeacherCircularRow,
} from "@/lib/dashboard/teacher-circulars";
import {
  deleteTeacherCircular,
  fetchTeacherCircularDetail,
  moveTeacherCircularCategory,
  reorderTeacherCircularCategories,
  restoreTeacherCircular,
  trashTeacherCircular,
} from "@/lib/teachers/circular-actions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

type View = "all" | "uncategorized" | "category" | "trash";

const CIRCULAR_MIME = "application/x-weeon-circular";
const CATEGORY_MIME = "application/x-weeon-category-reorder";

function formatListTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function categoryBadgeStyle(color: string) {
  return {
    backgroundColor: `${color}22`,
    color,
  };
}

/**
 * Teacher circulares — ERP Documents workspace style, scoped to the teacher's
 * own published notices (with trash + categories).
 */
export function CircularesWorkspace({
  circulars,
  trash,
  categories,
  groups,
}: {
  circulars: TeacherCircularRow[];
  trash: TeacherCircularRow[];
  categories: CircularCategory[];
  groups: CommsGroupWithGrade[];
}) {
  const t = useT();
  const router = useRouter();
  const previewRequest = useRef(0);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<TeacherCircularDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherCircularRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [localCategoriesByDoc, setLocalCategoriesByDoc] = useState<Record<string, string | null>>(
    {},
  );
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [reorderTarget, setReorderTarget] = useState<{ id: string; after: boolean } | null>(null);
  const [categoryOrderOverride, setCategoryOrderOverride] = useState<string | null>(null);

  const categorySignature = categories.map((row) => row.id).join("|");
  const orderedCategories = useMemo(() => {
    if (!categoryOrder || categoryOrderOverride !== categorySignature) return categories;
    const byId = new Map(categories.map((row) => [row.id, row]));
    const next = categoryOrder.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
    return next.length === categories.length ? next : categories;
  }, [categories, categoryOrder, categoryOrderOverride, categorySignature]);

  const inTrash = view === "trash";
  const withLocalCategory = useMemo(
    () =>
      circulars.map((row) => {
        if (!(row.id in localCategoriesByDoc)) return row;
        const nextId = localCategoriesByDoc[row.id];
        const category = categories.find((item) => item.id === nextId) ?? null;
        return {
          ...row,
          categoryId: nextId,
          categoryName: category?.name ?? null,
          categoryColor: category?.color ?? null,
        };
      }),
    [circulars, localCategoriesByDoc, categories],
  );
  const scoped = inTrash ? trash : withLocalCategory;
  const totalCount = withLocalCategory.length;
  const uncategorizedCount = useMemo(
    () => withLocalCategory.filter((row) => !row.categoryName).length,
    [withLocalCategory],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of withLocalCategory) {
      if (!row.categoryId) continue;
      counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [withLocalCategory]);

  const scopedDocuments = useMemo(() => {
    if (view === "uncategorized") return withLocalCategory.filter((row) => !row.categoryName);
    if (view === "category" && categoryId) {
      return withLocalCategory.filter((row) => row.categoryId === categoryId);
    }
    return scoped;
  }, [withLocalCategory, scoped, view, categoryId]);

  const filteredDocuments = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return scopedDocuments;
    return scopedDocuments.filter(
      (row) =>
        row.title.toLowerCase().includes(term) ||
        (row.categoryName ?? "").toLowerCase().includes(term) ||
        (row.description ?? "").toLowerCase().includes(term),
    );
  }, [scopedDocuments, query]);

  function selectView(next: View, nextCategoryId: string | null = null) {
    setView(next);
    setCategoryId(nextCategoryId);
    setSelectedId(null);
    setPreviewDetail(null);
    setPreviewLoading(false);
  }

  function clearSelection() {
    previewRequest.current += 1;
    setSelectedId(null);
    setPreviewDetail(null);
    setPreviewLoading(false);
  }

  async function openPreview(documentId: string) {
    const request = ++previewRequest.current;
    setSelectedId(documentId);
    setPreviewLoading(true);
    setPreviewDetail(null);
    const detail = await fetchTeacherCircularDetail(documentId);
    if (request !== previewRequest.current) return;
    setPreviewDetail(detail);
    setPreviewLoading(false);
  }

  async function handleTrash(row: TeacherCircularRow) {
    const res = inTrash
      ? await restoreTeacherCircular(row.id)
      : await trashTeacherCircular(row.id);
    if (!res.ok) return;
    if (selectedId === row.id) clearSelection();
    router.refresh();
  }

  async function handlePermanentDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const res = await deleteTeacherCircular(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) return;
    if (selectedId === deleteTarget.id) clearSelection();
    setDeleteTarget(null);
    router.refresh();
  }

  function moveToCategory(documentId: string, nextCategoryId: string | null) {
    const current = withLocalCategory.find((row) => row.id === documentId);
    if (!current || (current.categoryId ?? null) === nextCategoryId) return;
    // Optimistic: reflect the move immediately, then persist.
    setLocalCategoriesByDoc((prev) => ({ ...prev, [documentId]: nextCategoryId }));
    void (async () => {
      const res = await moveTeacherCircularCategory(documentId, nextCategoryId);
      if (!res.ok) {
        setLocalCategoriesByDoc((prev) => {
          const copy = { ...prev };
          delete copy[documentId];
          return copy;
        });
        return;
      }
      router.refresh();
    })();
  }

  function applyCategoryReorder(dragId: string, targetId: string, insertAfter: boolean) {
    if (dragId === targetId) return;
    const from = orderedCategories.findIndex((row) => row.id === dragId);
    const targetIndex = orderedCategories.findIndex((row) => row.id === targetId);
    if (from < 0 || targetIndex < 0) return;
    const next = [...orderedCategories];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    // Recompute the destination after removal so "insert after" lands correctly
    // whether the dragged item came from above or below the target.
    const targetAfterRemoval = next.findIndex((row) => row.id === targetId);
    const insertAt = insertAfter ? targetAfterRemoval + 1 : targetAfterRemoval;
    next.splice(insertAt, 0, moved);
    const ids = next.map((row) => row.id);
    setCategoryOrder(ids);
    setCategoryOrderOverride(categorySignature);
    void (async () => {
      const res = await reorderTeacherCircularCategories(ids);
      if (!res.ok) {
        setCategoryOrder(null);
        setCategoryOrderOverride(null);
        return;
      }
      router.refresh();
    })();
  }

  const showPane = selectedId != null;
  const selectedSummary = scopedDocuments.find((row) => row.id === selectedId) ?? null;

  return (
    <>
      <div className="wa-chat flex h-full min-h-0 overflow-hidden rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-panel)] shadow-[var(--wa-shadow)]">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,412px)_minmax(0,1fr)]">
          <aside
            className={cn(
              "flex min-h-0 flex-col border-[var(--wa-border)] bg-[var(--wa-header)]",
              showPane ? "hidden lg:flex lg:border-r" : "flex",
            )}
          >
            <div className="shrink-0 px-4 pb-3 pt-4">
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <h1 className="text-[22px] font-bold tracking-tight text-[var(--wa-text)]">
                    {t("comms.documents.circularsTitle")}
                  </h1>
                  {totalCount > 0 ? (
                    <span className="rounded-full bg-[var(--wa-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--wa-accent)]">
                      {totalCount > 99 ? "99+" : totalCount}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setPublishOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--wa-fab)] px-3.5 text-[13px] font-semibold text-[var(--wa-fab-ink)] shadow-sm transition-all hover:brightness-105 active:scale-95"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("comms.newCircular")}
                </button>
              </div>
              <label className="flex items-center gap-2.5 rounded-full border border-transparent bg-[var(--wa-search)] px-3.5 py-2.5 transition-colors focus-within:border-[var(--wa-ring)] focus-within:ring-2 focus-within:ring-[var(--wa-ring-soft)]">
                <Search className="h-[17px] w-[17px] shrink-0 text-[var(--wa-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("comms.documents.search")}
                  className="h-5 w-full bg-transparent text-[14px] text-[var(--wa-text)] outline-none placeholder:text-[var(--wa-muted)]"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("common.cancel")}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--wa-muted)] hover:text-[var(--wa-text)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              <nav className="flex flex-col gap-0.5 px-1 pt-1">
                <FilterRow
                  active={view === "all"}
                  label={t("comms.documents.all")}
                  count={totalCount}
                  onClick={() => selectView("all")}
                  icon={<FileText className="h-4 w-4 text-[var(--wa-muted)]" />}
                />
                <FilterRow
                  active={view === "uncategorized"}
                  label={t("comms.documents.uncategorized")}
                  count={uncategorizedCount}
                  onClick={() => selectView("uncategorized")}
                  icon={<span className="h-2.5 w-2.5 rounded-full bg-[var(--wa-muted)]" />}
                  dropCategoryId={null}
                  draggingId={draggingId}
                  onMoveCircular={moveToCategory}
                />
                {orderedCategories.map((category) => (
                  <FilterRow
                    key={category.id}
                    active={view === "category" && categoryId === category.id}
                    label={category.name}
                    count={categoryCounts.get(category.id) ?? 0}
                    onClick={() => selectView("category", category.id)}
                    icon={
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color ?? "#5e25cc" }}
                      />
                    }
                    dropCategoryId={category.id}
                    draggingId={draggingId}
                    onMoveCircular={moveToCategory}
                    categoryReorderId={category.id}
                    draggingCategoryId={draggingCategoryId}
                    reorderTarget={reorderTarget}
                    onCategoryDragStart={() => setDraggingCategoryId(category.id)}
                    onCategoryDragEnd={() => {
                      setDraggingCategoryId(null);
                      setReorderTarget(null);
                    }}
                    onCategoryDragOver={(after) => setReorderTarget({ id: category.id, after })}
                    onCategoryDragLeave={() =>
                      setReorderTarget((current) =>
                        current?.id === category.id ? null : current,
                      )
                    }
                    onCategoryDrop={(dragId, after) => {
                      setReorderTarget(null);
                      applyCategoryReorder(dragId, category.id, after);
                    }}
                  />
                ))}
                <FilterRow
                  active={view === "trash"}
                  label={t("comms.folderTrash")}
                  onClick={() => selectView("trash")}
                  icon={<Trash2 className="h-4 w-4 text-[var(--wa-muted)]" />}
                />
                <button
                  type="button"
                  onClick={() => setNewCategoryOpen(true)}
                  className="mt-0.5 inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-[var(--wa-muted)] transition-colors hover:bg-[var(--wa-hover)] hover:text-[var(--wa-text)]"
                >
                  <Plus className="h-4 w-4" />
                  {t("comms.documents.newCategory")}
                </button>
              </nav>
              <div className="mx-3 my-2 border-t border-[var(--wa-border)]" />

              {scopedDocuments.length === 0 ? (
                <div className="mx-2 mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--wa-chip-line)] bg-[var(--wa-search)] px-5 py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--wa-accent-soft)]">
                    <FileText className="h-7 w-7 text-[var(--wa-accent)]" aria-hidden />
                  </span>
                  <p className="text-sm font-semibold text-[var(--wa-text)]">
                    {inTrash ? t("comms.documents.emptyTrash") : t("comms.documents.empty")}
                  </p>
                  <p className="max-w-[220px] text-xs leading-relaxed text-[var(--wa-muted)]">
                    {inTrash ? t("comms.documents.emptyTrashBody") : t("comms.documents.emptyBody")}
                  </p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--wa-muted)]">
                  {t("comms.documents.empty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {filteredDocuments.map((row) => {
                    const active = row.id === selectedId;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          draggable={!inTrash}
                          onDragStart={
                            inTrash
                              ? undefined
                              : (event) => {
                                  event.dataTransfer.setData(CIRCULAR_MIME, row.id);
                                  event.dataTransfer.effectAllowed = "move";
                                  setDraggingId(row.id);
                                }
                          }
                          onDragEnd={inTrash ? undefined : () => setDraggingId(null)}
                          onClick={() => {
                            if (active) {
                              clearSelection();
                              return;
                            }
                            void openPreview(row.id);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            active ? "bg-[var(--wa-active)]" : "hover:bg-[var(--wa-hover)]",
                            !inTrash && "cursor-grab active:cursor-grabbing",
                            draggingId === row.id && "opacity-50",
                          )}
                        >
                          <span
                            className="inline-flex h-[49px] w-[49px] shrink-0 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: row.categoryColor || "#5e25cc" }}
                            aria-hidden
                          >
                            <FileText className="h-5 w-5" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex items-baseline gap-2">
                              <span className="min-w-0 flex-1 truncate text-[16px] text-[var(--wa-text)]">
                                {row.title}
                              </span>
                              <span className="shrink-0 text-[12px] text-[var(--wa-muted)]">
                                {formatListTime(row.publishedAt)}
                              </span>
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--wa-muted)]">
                              {t("comms.recipientsCount", { n: row.targetCount })}
                            </span>
                            {row.categoryName ? (
                              <span
                                className="w-fit rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
                                style={categoryBadgeStyle(row.categoryColor || "#5e25cc")}
                              >
                                {row.categoryName}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section
            className={cn("h-full min-h-0 min-w-0 flex-col", showPane ? "flex" : "hidden lg:flex")}
          >
            {showPane && selectedSummary ? (
              <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                <CircularPreviewPane
                  detail={previewDetail}
                  loading={previewLoading}
                  onClose={clearSelection}
                  onDelete={!inTrash ? () => void handleTrash(selectedSummary) : undefined}
                  onRestore={inTrash ? () => void handleTrash(selectedSummary) : undefined}
                  onPermanentDelete={inTrash ? () => setDeleteTarget(selectedSummary) : undefined}
                />
              </div>
            ) : (
              <div className="chat-wallpaper flex h-full flex-1 flex-col items-center justify-center gap-4 px-8 py-10 text-center">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--wa-search)] shadow-inner">
                  <FileText className="h-11 w-11 text-[var(--wa-muted)]" strokeWidth={1.25} aria-hidden />
                </span>
                <div className="max-w-md space-y-2">
                  <p className="text-[28px] font-light text-[var(--wa-text)]">
                    {t("comms.documents.circularsTitle")}
                  </p>
                  <p className="text-sm text-[var(--wa-muted)]">
                    {t("comms.documents.selectPrompt")}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <PublishCircularDialog
        open={publishOpen}
        categories={categories}
        groups={groups}
        onClose={() => setPublishOpen(false)}
        onPublished={() => clearSelection()}
      />

      <NewCategoryDialog
        open={newCategoryOpen}
        onClose={() => setNewCategoryOpen(false)}
        onCreated={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("comms.deletePermanently")}
        description={t("comms.documents.deleteConfirm", { title: deleteTarget?.title ?? "" })}
        confirmLabel={t("comms.deletePermanently")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => void handlePermanentDelete()}
        onCancel={() => setDeleteTarget(null)}
        destructive
        pending={deleting}
      />
    </>
  );
}

function FilterRow({
  active,
  label,
  count,
  icon,
  onClick,
  dropCategoryId,
  draggingId,
  onMoveCircular,
  categoryReorderId,
  draggingCategoryId,
  reorderTarget,
  onCategoryDragStart,
  onCategoryDragEnd,
  onCategoryDragOver,
  onCategoryDragLeave,
  onCategoryDrop,
}: {
  active: boolean;
  label: string;
  count?: number;
  icon: React.ReactNode;
  onClick: () => void;
  /** When set, the row accepts dropped circulares and moves them here. */
  dropCategoryId?: string | null;
  draggingId?: string | null;
  onMoveCircular?: (documentId: string, categoryId: string | null) => void;
  /** When set, the row is a draggable category (reorder by position). */
  categoryReorderId?: string;
  draggingCategoryId?: string | null;
  reorderTarget?: { id: string; after: boolean } | null;
  onCategoryDragStart?: () => void;
  onCategoryDragEnd?: () => void;
  onCategoryDragOver?: (insertAfter: boolean) => void;
  onCategoryDragLeave?: () => void;
  onCategoryDrop?: (dragId: string, insertAfter: boolean) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const droppable = dropCategoryId !== undefined && onMoveCircular != null;
  const reorderable = categoryReorderId !== undefined;
  const isTarget = reorderTarget?.id === categoryReorderId && draggingCategoryId != null;
  const insertAfter = isTarget && reorderTarget?.after === true;
  const handleDragging = draggingCategoryId === categoryReorderId;

  /** Which half of the row the pointer is over → insert before/after. */
  function pointerIsInBottomHalf(event: React.DragEvent): boolean {
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return event.clientY > rect.top + rect.height / 2;
  }

  // A draggable handle cannot live inside a <button> (buttons swallow drag).
  // The row is a flex <div>; the handle is a sibling drag source, the label a
  // click target, sharing the drop handlers for circulars/category reorder.
  return (
    <div
      ref={rowRef}
      onDragOver={(event) => {
        if (!droppable && !reorderable) return;
        const types = event.dataTransfer.types;
        if (!types.includes(CIRCULAR_MIME) && !types.includes(CATEGORY_MIME)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (reorderable && types.includes(CATEGORY_MIME)) {
          onCategoryDragOver?.(pointerIsInBottomHalf(event));
        }
      }}
      onDragLeave={reorderable ? () => onCategoryDragLeave?.() : undefined}
      onDrop={(event) => {
        event.preventDefault();
        const documentId = event.dataTransfer.getData(CIRCULAR_MIME);
        if (documentId) {
          onMoveCircular?.(documentId, dropCategoryId ?? null);
          onCategoryDragEnd?.();
          return;
        }
        const dragCategoryId = event.dataTransfer.getData(CATEGORY_MIME);
        if (dragCategoryId) {
          onCategoryDrop?.(dragCategoryId, pointerIsInBottomHalf(event));
          onCategoryDragEnd?.();
        }
      }}
      className={cn(
        "relative flex items-center gap-1 rounded-xl px-1.5 py-1 transition-colors",
        active ? "bg-[var(--wa-active)]" : "hover:bg-[var(--wa-hover)]",
        droppable && draggingId && "ring-1 ring-inset ring-[var(--wa-ring)]/40",
        isTarget &&
          !insertAfter &&
          "before:absolute before:inset-x-2 before:-top-px before:h-[2px] before:rounded-full before:bg-[var(--wa-accent)]",
        isTarget &&
          insertAfter &&
          "after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:bg-[var(--wa-accent)]",
        handleDragging && "opacity-50",
      )}
    >
      {reorderable ? (
        <span
          draggable
          role="button"
          tabIndex={-1}
          aria-label={label}
          onDragStart={(event) => {
            event.dataTransfer.setData(CATEGORY_MIME, categoryReorderId);
            event.dataTransfer.effectAllowed = "move";
            onCategoryDragStart?.();
          }}
          onDragEnd={() => onCategoryDragEnd?.()}
          className="inline-flex h-6 w-4 shrink-0 cursor-grab items-center justify-center text-[var(--wa-muted)] active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[14px]",
          active ? "font-semibold text-[var(--wa-text)]" : "font-medium text-[var(--wa-text)]",
        )}
      >
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {count != null ? (
          <span className="text-[12px] tabular-nums text-[var(--wa-muted)]">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
    </div>
  );
}