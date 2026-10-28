"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Folder, FolderPlus, Loader2 } from "lucide-react";
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
import {
  createLibraryCollection,
  saveAssessmentToLibrary,
} from "@/lib/teachers/library-actions";
import { loadLibraryForPicker } from "@/lib/teachers/library-picker-actions";
import { cn } from "@/lib/utils";

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
  const [saved, setSaved] = useState(false);
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const newCollectionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(draft.title);
    setError(null);
    setSaved(false);
    setAddingCollection(false);
    setNewCollection("");
    void loadLibraryForPicker().then((res) => setCollections(res.collections));
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
    setSaved(true);
    onSaved();
  }

  async function addCollection() {
    const name = newCollection.trim();
    if (!name) return;
    const res = await createLibraryCollection({ name });
    if (res.ok && res.id) {
      setCollections((current) => [
        ...current,
        { id: res.id!, name, color: null, position: current.length, itemCount: 0 },
      ]);
      setCollectionId(res.id);
      setAddingCollection(false);
      setNewCollection("");
    }
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
            {saved ? t.common.close : t.common.cancel}
          </DialogSecondary>
          <DialogPrimary
            onClick={() => void submit()}
            disabled={pending || saved || draft.content.questions.length === 0}
            className="w-full sm:w-auto"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? l.saved : l.saveAction}
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
              disabled={!newCollection.trim()}
              className="h-11 shrink-0 rounded-xl bg-surface-muted px-3.5 text-sm font-semibold text-foreground/75 transition-colors hover:bg-border disabled:opacity-45"
            >
              {l.createCollection}
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
