"use client";

import { useState } from "react";
import { FileText, Plus, Upload } from "lucide-react";
import { publishTeacherCircular } from "@/lib/teachers/circular-actions";
import { useT } from "@/lib/i18n/client";
import type { CircularCategory, TeacherCircularRow } from "@/lib/dashboard/teacher-circulars";
import { cn } from "@/lib/utils";

type GroupOption = {
  id: string;
  name: string;
  parentCount: number;
  studentCount: number;
};

type TeacherCircularsWorkspaceProps = {
  circulars: TeacherCircularRow[];
  groups: GroupOption[];
  categories: CircularCategory[];
};

type TargetKind = "parents" | "students";

/** Teacher circulares: list of published notices + publish dialog (PDF → groups). */
export function TeacherCircularsWorkspace({
  circulars,
  groups,
  categories,
}: TeacherCircularsWorkspaceProps) {
  const t = useT();
  const c = t.circulares;
  const [composing, setComposing] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/60">
          {c.listTitle}
        </h2>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5e25cc] to-[#2b59ff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {c.newCircular}
        </button>
      </div>

      {circulars.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-foreground/55">
          {c.empty}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {circulars.map((circular, index) => (
            <li
              key={circular.id}
              className={cn(
                "flex items-start gap-3 p-4",
                index < circulars.length - 1 && "border-b border-border",
              )}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-foreground/60">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{circular.title}</p>
                {circular.description ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-foreground/55">
                    {circular.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs font-medium text-foreground/45">
                  {[circular.categoryName, c.targetCount(circular.targetCount)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <time className="shrink-0 text-xs text-foreground/45">
                {formatDate(circular.publishedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}

      {composing ? (
        <PublishCircularDialog
          groups={groups}
          categories={categories}
          onClose={() => setComposing(false)}
        />
      ) : null}
    </div>
  );
}

function PublishCircularDialog({
  groups,
  categories,
  onClose,
}: {
  groups: GroupOption[];
  categories: CircularCategory[];
  onClose: () => void;
}) {
  const t = useT();
  const c = t.circulares;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [targets, setTargets] = useState<Record<string, TargetKind[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (groupId: string, kind: TargetKind) => {
    setTargets((current) => {
      const existing = current[groupId] ?? [];
      const next = existing.includes(kind)
        ? existing.filter((value) => value !== kind)
        : [...existing, kind];
      const copy = { ...current };
      if (next.length === 0) delete copy[groupId];
      else copy[groupId] = next;
      return copy;
    });
  };

  const onSubmit = async () => {
    setError(null);
    if (!title.trim()) return setError(c.requireTitle);
    if (!file) return setError(c.requireFile);
    const targetList = Object.entries(targets).flatMap(([classId, kinds]) =>
      kinds.map((kind) => ({ classId, kind })),
    );
    if (targetList.length === 0) return setError(c.requireAudience);

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("categoryId", categoryId);
    formData.set("targets", JSON.stringify(targetList));
    formData.set("file", file);

    setBusy(true);
    try {
      const result = await publishTeacherCircular(formData);
      if (!result.ok) {
        setError(result.error || c.publishError);
        return;
      }
      onClose();
    } catch {
      setError(c.publishError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={c.newCircular}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{c.newCircular}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-foreground/60 hover:bg-surface-muted"
          >
            {c.close}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground/70">{c.titleLabel}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={c.titlePlaceholder}
              maxLength={160}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#5e25cc]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground/70">{c.descriptionLabel}</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={c.descriptionPlaceholder}
              maxLength={400}
              rows={2}
              className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#5e25cc]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground/70">{c.categoryLabel}</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#5e25cc]"
            >
              <option value="">{c.noCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground/70">{c.audienceLabel}</span>
            {groups.length === 0 ? (
              <p className="text-sm text-foreground/55">{c.noGroups}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {groups.map((group) => {
                  const selected = targets[group.id] ?? [];
                  return (
                    <li
                      key={group.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {group.name}
                      </span>
                      <label className="inline-flex items-center gap-2 text-sm text-foreground/70">
                        <input
                          type="checkbox"
                          checked={selected.includes("parents")}
                          onChange={() => toggle(group.id, "parents")}
                          className="h-4 w-4 accent-[#5e25cc]"
                        />
                        {c.parents} ({group.parentCount})
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-foreground/70">
                        <input
                          type="checkbox"
                          checked={selected.includes("students")}
                          onChange={() => toggle(group.id, "students")}
                          className="h-4 w-4 accent-[#5e25cc]"
                        />
                        {c.students} ({group.studentCount})
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground/70">{c.fileLabel}</span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-sm font-medium text-foreground/70 hover:border-[#5e25cc]">
              <Upload className="h-4 w-4" aria-hidden />
              {file ? file.name : c.chooseFile}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-xs text-foreground/45">{c.fileHint}</span>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-surface-muted"
          >
            {c.cancel}
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-[#5e25cc] to-[#2b59ff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-60"
          >
            {busy ? c.publishing : c.publish}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CR", { day: "2-digit", month: "short" }).format(date);
}
