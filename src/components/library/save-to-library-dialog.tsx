"use client";

import { useEffect, useRef, useState } from "react";
import { Folder, FolderPlus, Loader2, Users } from "lucide-react";
import {
  DIALOG_CONTROL,
  Dialog,
  DialogField,
  DialogPrimary,
  DialogSecondary,
} from "@/components/ui/dialog";
import { SelectMenu } from "@/components/ui/select-menu";
import { useLiveT } from "@/lib/i18n/client";
import type { AssessmentDraft } from "@/lib/assessments/model";
import type { LibraryCollection } from "@/lib/assessments/library";
import { fetchShareableTeachers } from "@/lib/teachers/library-client-actions";
import { cn } from "@/lib/utils";
import {
  createLibraryCollection,
  saveAssessmentToLibrary,
  shareLibraryItem,
} from "@/lib/teachers/library-actions";
import { loadLibraryForPicker } from "@/lib/teachers/library-picker-actions";


/**
 * "Guardar en mis evaluaciones" — the one action that turns a class assessment
 * into a reusable library item.
 *
 * It always writes a **fresh copy** (the design's snapshot rule): saving twice
 * yields two items, which is honest — the assessment may have changed in
 * between and the teacher chooses which version to keep. Collections are
 * optional; an unfiled item is perfectly valid.
 */
export function SaveToLibraryDialog({
  open,
  draft,
  onClose,
  onSaved,
}: {
  open: boolean;
  draft: AssessmentDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useLiveT();
  const l = t.library;

  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [title, setTitle] = useState(draft.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingCollection, setAddingCollection] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const newCollectionRef = useRef<HTMLInputElement>(null);
  const [teachers, setTeachers] = useState<
    Array<{ id: string; name: string; email: string | null }>
  >([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(draft.title);
    setError(null);
    setAddingCollection(false);
    setNewCollection("");
    setSharedWith([]);
    void loadLibraryForPicker().then((res) => setCollections(res.collections));
    // Sharing is optional: the list loads alongside the collections so a saved
    // item can go straight to colleagues without opening Mis evaluaciones.
    void fetchShareableTeachers({ itemId: null }).then((res) => {
      if (res.ok) setTeachers(res.teachers);
    });
  }, [open, draft.title]);

  useEffect(() => {
    if (addingCollection) newCollectionRef.current?.focus();
  }, [addingCollection]);

  async function submit() {
    setPending(true);
    setError(null);
    const res = await saveAssessmentToLibrary({
      title: title.trim() || draft.title,
      kind: draft.kind,
      subjectId: draft.subjectId,
      gradeLevel: gradeLevel.trim() || null,
      collectionId: collectionId || null,
      instructions: draft.instructions,
      content: draft.content,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Shares need the saved item id, so they run after the write. A failure
    // here must not look like a failed save: the item exists either way, so the
    // dialog closes and the teacher can retry from Mis evaluaciones.
    if (res.id && sharedWith.length > 0) {
      const results = await Promise.all(
        sharedWith.map((teacherId) => shareLibraryItem({ itemId: res.id!, teacherId })),
      );
      const failed = results.filter((result) => !result.ok).length;
      if (failed > 0) {
        setError(
          `Se guardó, pero ${failed} de ${sharedWith.length} no se pudo compartir.`,
        );
        return;
      }
    }
    // Close on success: the refresh from `onSaved` is the confirmation, so
    // leaving the dialog open only added a second "Guardado" state to dismiss.
    onClose();
    onSaved();
  }

  async function addCollection() {
    const name = newCollection.trim();
    if (!name || creatingCollection) return;
    setCreatingCollection(true);
    setError(null);
    const res = await createLibraryCollection({ name });
    setCreatingCollection(false);
    if (!res.ok) {
      // Surface the server message: a silent failure left the teacher typing
      // into a collection that was never created.
      setError(res.error);
      return;
    }
    const created = res.collection ?? {
      id: res.id!,
      name,
      color: null,
      position: collections.length,
    };
    setCollections((current) => [...current, { ...created, itemCount: 0 }]);
    setCollectionId(created.id);
    setAddingCollection(false);
    setNewCollection("");
  }

  const selectedName =
    collections.find((collection) => collection.id === collectionId)?.name ??
    l.noCollection;

  return (
    <Dialog
      open={open}
      title={l.saveTitle}
      description={l.saveHint}
      icon={<FolderPlus className="h-[18px] w-[18px]" strokeWidth={2.1} />}
      onClose={onClose}
      footer={
        <>
          <DialogSecondary onClick={onClose} className="sm:mr-auto">
            {t.common.cancel}
          </DialogSecondary>
          <DialogPrimary
            onClick={() => void submit()}
            disabled={pending || draft.content.questions.length === 0}
            className="w-full sm:w-auto"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {l.saveAction}
          </DialogPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <DialogField label={l.titleLabel}>
          <div className={DIALOG_CONTROL}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="h-11 w-full min-w-0 border-0 bg-transparent px-3.5 text-[15px] font-semibold text-foreground outline-none"
            />
          </div>
        </DialogField>

        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
          <DialogField label={l.gradeLevel}>
            <div className={DIALOG_CONTROL}>
              <input
                value={gradeLevel}
                onChange={(event) => setGradeLevel(event.target.value)}
                placeholder={l.gradeLevelPlaceholder}
                maxLength={20}
                className="h-11 w-full min-w-0 border-0 bg-transparent px-3 text-center text-[15px] font-semibold tabular-nums text-foreground outline-none"
              />
            </div>
          </DialogField>

          <DialogField label={l.collectionLabel}>
            <SelectMenu
              label={l.moveToCollection}
              value={collectionId}
              onChange={setCollectionId}
              options={[
                { value: "", label: l.noCollection },
                ...collections.map((collection) => ({
                  value: collection.id,
                  label: collection.name,
                  icon: <Folder className="h-3.5 w-3.5" />,
                })),
              ]}
            />
          </DialogField>
        </div>

        {addingCollection ? (
          <div className="flex items-center gap-2">
            <div className={cn(DIALOG_CONTROL, "min-w-0 flex-1")}>
              <input
                ref={newCollectionRef}
                value={newCollection}
                onChange={(event) => setNewCollection(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addCollection();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setAddingCollection(false);
                  }
                }}
                placeholder={l.collectionPlaceholder}
                maxLength={80}
                aria-label={l.collectionName}
                className="h-11 w-full min-w-0 border-0 bg-transparent px-3.5 text-[15px] font-medium text-foreground outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void addCollection()}
              disabled={!newCollection.trim() || creatingCollection}
              className="h-11 shrink-0 rounded-xl bg-surface-muted px-3.5 text-sm font-semibold text-foreground/75 transition-colors hover:bg-border disabled:opacity-45"
            >
              {creatingCollection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                l.createCollection
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCollection(true)}
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-dashed border-border px-3 py-1.5 text-[13px] font-semibold text-foreground/60 transition-colors hover:border-[#0891B2]/40 hover:bg-[#0891B2]/5 hover:text-[#0e7490] dark:hover:text-[#22d3ee]"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {l.newCollection}
          </button>
        )}

        {collectionId ? (
          <p className="text-[11.5px] leading-snug text-foreground/45">
            {l.savedInCollection(selectedName)}
          </p>
        ) : null}

        {teachers.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-foreground/45" />
              <p className="text-[12.5px] font-semibold text-foreground/70">
                {l.shareWithTeachers}
              </p>
            </div>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {teachers.map((teacher) => {
                const checked = sharedWith.includes(teacher.id);
                return (
                  <label
                    key={teacher.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                      checked
                        ? "bg-[#0891B2]/10 text-foreground"
                        : "text-foreground/70 hover:bg-surface-muted",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setSharedWith((current) =>
                          event.target.checked
                            ? [...current, teacher.id]
                            : current.filter((id) => id !== teacher.id),
                        )
                      }
                      className="h-3.5 w-3.5 accent-[#0891B2]"
                    />
                    <span className="truncate">{teacher.name}</span>
                    {teacher.email ? (
                      <span className="truncate text-[11.5px] text-foreground/40">
                        {teacher.email}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <p className="text-[11.5px] leading-snug text-foreground/45">
              {sharedWith.length === 0
                ? l.shareWithNone
                : l.shareWithCount(sharedWith.length)}
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-error/25 bg-error/5 px-3 py-2 text-[13px] font-medium text-error"
          >
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
