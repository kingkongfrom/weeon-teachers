"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import { Dialog } from "@/components/ui/dialog";
import { uploadMaterial } from "@/lib/teachers/materials-actions";
import { MATERIAL_ACCEPT } from "@/lib/teachers/material-constants";
import type { ClassMaterial } from "@/lib/dashboard/materials";

/** Minimal shape the picker needs; new uploads are merged into the local list. */
type PickableMaterial = Pick<
  ClassMaterial,
  "id" | "title" | "description" | "mimeType" | "thumbnailUrl"
>;

/**
 * Study material for an exam date, shown as a row of square tiles. The first
 * tile is the upload button; each added PDF is a tile beside it. The teacher can
 * also pick documents already shared with the class. New uploads are recorded as
 * class materials, so they also appear in the group's Materiales.
 */
export function StudyMaterialPicker({
  classId,
  subjectId,
  materials,
  selectedIds,
  onChange,
}: {
  classId: string;
  subjectId: string | null;
  materials: ClassMaterial[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useLiveT();
  const e = t.examDates;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploaded, setUploaded] = useState<PickableMaterial[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const all: PickableMaterial[] = [
    ...materials,
    ...uploaded.filter((item) => !materials.some((material) => material.id === item.id)),
  ];
  const selected = all.filter((material) => selectedIds.includes(material.id));
  const canUpload = Boolean(classId);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((current) => current !== id)
        : [...selectedIds, id],
    );
  }

  async function handleFile(file: File) {
    if (!canUpload || uploading) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("subjectId", subjectId ?? "");
    formData.set("title", file.name.replace(/\.[^.]+$/, ""));
    formData.set("file", file);
    const res = await uploadMaterial(formData);
    setUploading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const id = res.id ?? "";
    const created: PickableMaterial = {
      id,
      title: file.name.replace(/\.[^.]+$/, ""),
      description: null,
      mimeType: file.type || null,
      thumbnailUrl: null,
    };
    setUploaded((current) => [...current, created]);
    if (id && !selectedIds.includes(id)) onChange([...selectedIds, id]);
    // Pull the freshly-generated thumbnail (and Markdown-free list) from the server.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-foreground/45">
          {e.materialLabel}
        </span>
        {all.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
          >
            <Plus className="h-3.5 w-3.5" />
            {e.materialAdd}
          </button>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={MATERIAL_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        {selected.map((material) => (
          <MaterialTile
            key={material.id}
            title={material.title}
            thumbnailUrl={material.thumbnailUrl}
            onRemove={() => toggle(material.id)}
            removeLabel={e.materialRemove}
          />
        ))}

        {canUpload ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={e.materialUpload}
            title={e.materialUpload}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-foreground/55 transition-colors hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 disabled:opacity-50 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span className="px-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide">
              {uploading ? e.materialUploading : e.materialUpload}
            </span>
          </button>
        ) : null}
      </div>

      {selected.length === 0 && !canUpload ? (
        <p className="text-xs font-medium text-foreground/45">{e.materialEmpty}</p>
      ) : null}
      {error ? <p className="text-xs font-medium text-error">{error}</p> : null}
      <p className="text-[11px] font-medium text-foreground/45">{e.materialHint}</p>

      <Dialog open={open} title={e.materialLabel} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-1.5">
          {all.length === 0 ? (
            <p className="py-6 text-center text-sm font-medium text-foreground/45">
              {e.materialEmpty}
            </p>
          ) : null}
          {all.map((material) => {
            const isOn = selectedIds.includes(material.id);
            return (
              <button
                key={material.id}
                type="button"
                onClick={() => toggle(material.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  isOn
                    ? "border-brand-300 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/30"
                    : "border-border bg-surface hover:bg-surface-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isOn
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"
                      : "bg-surface-muted text-foreground/45",
                  )}
                >
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {material.title}
                  </span>
                  {material.description ? (
                    <span className="block truncate text-xs font-medium text-foreground/50">
                      {material.description}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    isOn ? "border-brand-500 bg-brand-500 text-white" : "border-border",
                  )}
                >
                  {isOn ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Dialog>
    </div>
  );
}

/** One added study-material file, as a square tile with a remove control. */
function MaterialTile({
  title,
  thumbnailUrl,
  onRemove,
  removeLabel,
}: {
  title: string;
  thumbnailUrl: string | null;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-border bg-surface-muted px-1.5 text-foreground/70">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <>
          <FileText className="h-5 w-5 text-foreground/45" />
          <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight">
            {title}
          </span>
        </>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeLabel} ${title}`}
        title={removeLabel}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-foreground/50 opacity-0 shadow-sm transition-opacity hover:text-error group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
