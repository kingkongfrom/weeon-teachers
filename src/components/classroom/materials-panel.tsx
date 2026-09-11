"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ClipboardList,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ClassMaterial } from "@/lib/dashboard/materials";
import type { ClassTopic } from "@/lib/dashboard/topics";
import {
  MATERIAL_ACCEPT,
  MATERIAL_MAX_BYTES,
  isAllowedMaterialFile,
} from "@/lib/teachers/material-constants";
import {
  deleteMaterial,
  getMaterialDownloadUrl,
  uploadMaterial,
} from "@/lib/teachers/materials-actions";

function fileIcon(mime: string | null): LucideIcon {
  if (!mime) return File;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("spreadsheet") || mime.includes("excel")) return FileSpreadsheet;
  if (
    mime === "application/pdf" ||
    mime.startsWith("text/") ||
    mime.includes("word") ||
    mime.includes("presentation")
  ) {
    return FileText;
  }
  return File;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/** "Trabajo de clase" tab: documents the teacher shares with a group.
 * Files can be dragged anywhere onto the panel, or picked in the dialog. */
export function MaterialsPanel({
  classId,
  materials,
  topics = [],
  defaultTopicId = null,
}: {
  classId: string;
  materials: ClassMaterial[];
  topics?: ClassTopic[];
  defaultTopicId?: string | null;
}) {
  const t = useT();
  const tPanel = t.classroom.materialsPanel;
  const [open, setOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassMaterial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);

  function handleDragEnter(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent) {
    if (!hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }

  function handleDrop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setOpen(true);
  }

  async function handleDownload(id: string) {
    setError(null);
    setBusyId(id);
    const res = await getMaterialDownloadUrl({ id });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.location.assign(res.url);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError(null);
    setDeleting(true);
    const res = await deleteMaterial({ id: deleteTarget.id, classId });
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDeleteTarget(null);
  }

  return (
    <section
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col gap-4 rounded-2xl transition-shadow"
    >
      {dragActive ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/70 backdrop-blur-[1px] dark:bg-brand-950/40">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-200">
            <Upload className="h-4 w-4" />
            {tPanel.dropHint}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
          {tPanel.heading}
        </h3>
        <button
          type="button"
          onClick={() => {
            setPendingFile(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {tPanel.add}
        </button>
      </div>

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

      {materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground/50">
            <ClipboardList className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">
            {tPanel.emptyTitle}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
            {tPanel.emptyBody}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {materials.map((material) => {
            const Icon = fileIcon(material.mimeType);
            const size = formatBytes(material.sizeBytes);
            const busy = busyId === material.id;
            return (
              <li
                key={material.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {material.title}
                  </p>
                  {material.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium text-foreground/55">
                      {material.description}
                    </p>
                  ) : null}
                  <p className="mt-1 truncate text-[11px] font-medium text-foreground/40">
                    {material.fileName}
                    {size ? ` · ${size}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleDownload(material.id)}
                    disabled={busy}
                    title={tPanel.download}
                    aria-label={tPanel.download}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(material)}
                    disabled={busy}
                    title={tPanel.delete}
                    aria-label={tPanel.delete}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-error/80 transition-colors hover:bg-error/10 hover:text-error disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <UploadDialog
                  key="upload-material"
                  classId={classId}
                  initialFile={pendingFile}
                  topics={topics}
                  defaultTopicId={defaultTopicId}
                  onClose={() => {
                    setOpen(false);
                    setPendingFile(null);
                  }}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={tPanel.deleteConfirm}
        description={deleteTarget?.title}
        confirmLabel={tPanel.delete}
        cancelLabel={tPanel.cancel}
        pending={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </section>
  );
}

function UploadDialog({
  classId,
  initialFile,
  topics,
  defaultTopicId,
  onClose,
}: {
  classId: string;
  initialFile: File | null;
  topics: ClassTopic[];
  defaultTopicId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const tPanel = t.classroom.materialsPanel;
  const [file, setFile] = useState<File | null>(initialFile);
  const [title, setTitle] = useState(initialFile ? initialFile.name.replace(/\.[^.]+$/, "") : "");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState(defaultTopicId ?? "none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function selectFile(candidate: File) {
    if (candidate.size > MATERIAL_MAX_BYTES) {
      setError(tPanel.errorTooLarge);
      return;
    }
    if (!isAllowedMaterialFile(candidate)) {
      setError(tPanel.errorType);
      return;
    }
    setError(null);
    setFile(candidate);
    if (!title.trim()) {
      setTitle(candidate.name.replace(/\.[^.]+$/, ""));
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError(tPanel.errorTitleRequired);
      return;
    }
    if (!file) {
      setError(tPanel.errorFileRequired);
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    if (topic !== "none") formData.set("topicId", topic);
    formData.set("file", file);

    setPending(true);
    const res = await uploadMaterial(formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <motion.button
        type="button"
        aria-label={tPanel.cancel}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={tPanel.dialogTitle}
        className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-foreground">
            {tPanel.dialogTitle}
          </h4>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/70">
              {tPanel.fileLabel}
            </span>
            <label
              htmlFor="material-file"
              onDragEnter={(event) => {
                if (!hasFiles(event)) return;
                event.preventDefault();
                dragDepth.current += 1;
                setDragging(true);
              }}
              onDragOver={(event) => {
                if (!hasFiles(event)) return;
                event.preventDefault();
              }}
              onDragLeave={(event) => {
                if (!hasFiles(event)) return;
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                dragging
                  ? "border-brand-400 bg-brand-50 dark:bg-brand-950/40"
                  : "border-border hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/20",
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                <Upload className="h-5 w-5" />
              </span>
              {file ? (
                <span className="min-w-0 max-w-full">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {file.name}
                  </span>
                  <span className="text-[11px] font-medium text-foreground/45">
                    {formatBytes(file.size)}
                  </span>
                </span>
              ) : (
                <span className="text-sm font-medium text-foreground/60">
                  {dragging ? tPanel.dropActive : tPanel.dropHint}
                </span>
              )}
              <span className="text-[11px] font-medium text-foreground/40">
                {tPanel.fileHint}
              </span>
            </label>
            <input
              id="material-file"
              name="file"
              type="file"
              ref={inputRef}
              accept={MATERIAL_ACCEPT}
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                if (chosen) selectFile(chosen);
                event.target.value = "";
              }}
              className="sr-only"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="material-title"
              className="text-xs font-semibold text-foreground/70"
            >
              {tPanel.titleLabel}
            </label>
            <input
              id="material-title"
              name="title"
              required
              maxLength={140}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={tPanel.titlePlaceholder}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
            />
          </div>

          {topics.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="material-topic"
                className="text-xs font-semibold text-foreground/70"
              >
                {t.topics.selectLabel}
              </label>
              <select
                id="material-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400"
              >
                <option value="none">{t.topics.none}</option>
                {topics.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="material-description"
              className="text-xs font-semibold text-foreground/70"
            >
              {tPanel.descriptionLabel}
            </label>
            <textarea
              id="material-description"
              name="description"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={tPanel.descriptionPlaceholder}
              className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-error">{error}</p>
          ) : null}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
            >
              {tPanel.cancel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl brand-gradient px-4 text-sm font-semibold text-white transition-all hover:brightness-105 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {pending ? tPanel.submitting : tPanel.submit}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
