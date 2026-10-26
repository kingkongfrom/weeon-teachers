"use client";

import { useEffect, useState } from "react";
import { Check, FolderPlus, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";
import type { AssessmentDraft } from "@/lib/assessments/model";
import type { LibraryCollection } from "@/lib/assessments/library";
import {
  createLibraryCollection,
  saveAssessmentToLibrary,
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
  const t = useT();
  const l = t.library;

  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [title, setTitle] = useState(draft.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newCollection, setNewCollection] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(draft.title);
    setError(null);
    setSaved(false);
    setNewCollection(null);
    void loadLibraryForPicker().then((res) => {
      setCollections(res.collections);
    });
  }, [open, draft.title]);

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
    const name = newCollection?.trim();
    if (!name) return;
    const res = await createLibraryCollection({ name });
    if (res.ok && res.id) {
      setCollections((current) => [
        ...current,
        { id: res.id!, name, color: null, position: current.length, itemCount: 0 },
      ]);
      setCollectionId(res.id);
    }
    setNewCollection(null);
  }

  return (
    <Dialog
      open={open}
      title={l.saveTitle}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold text-foreground/65 hover:bg-surface-muted"
          >
            {saved ? t.common.close : t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending || saved || draft.content.questions.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0891B2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0e7490] disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? l.saved : l.saveAction}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground/60">{l.saveHint}</p>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground/70">
          {l.titleLabel}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-brand-400"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground/70">
            {l.gradeLevel}
            <input
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              placeholder={l.gradeLevelPlaceholder}
              maxLength={20}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-brand-400"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground/70">
            {l.moveToCollection}
            <select
              value={collectionId}
              onChange={(event) => setCollectionId(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-2 text-sm font-medium text-foreground outline-none focus:border-brand-400"
            >
              <option value="">{l.noCollection}</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {newCollection === null ? (
          <button
            type="button"
            onClick={() => setNewCollection("")}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-[#0891B2] hover:underline"
          >
            <FolderPlus className="h-4 w-4" />
            {l.newCollection}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={newCollection}
              onChange={(event) => setNewCollection(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addCollection();
                }
              }}
              autoFocus
              placeholder={l.collectionPlaceholder}
              maxLength={80}
              className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-brand-400"
            />
            <button
              type="button"
              onClick={() => void addCollection()}
              className="h-9 rounded-full border border-border px-3 text-sm font-semibold text-foreground/70 hover:bg-surface-muted"
            >
              {l.createCollection}
            </button>
          </div>
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
