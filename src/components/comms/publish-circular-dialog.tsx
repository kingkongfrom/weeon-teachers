"use client";

import { useMemo, useRef, useState } from "react";
import { Cloud, FolderOpen, Loader2, Users, X } from "lucide-react";
import { CloudImportSources } from "@/components/comms/cloud-import-sources";
import {
  RecipientPickerModal,
  type PickerSelection,
} from "@/components/comms/recipient-picker-modal";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { Switch } from "@/components/ui/switch";
import { MESSAGE_ATTACHMENT_ACCEPT } from "@/lib/comms/attachment-mime";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import {
  attachmentDraftKey,
  attachmentDraftLabel,
  type AttachmentDraft,
  type CloudImportRef,
} from "@/lib/comms/cloud-import/types";
import { messagesTone } from "@/lib/comms/messages-tone";
import type { CircularCategory } from "@/lib/dashboard/teacher-circulars";
import { publishTeacherCircular } from "@/lib/teachers/circular-actions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

const MAX_ATTACHMENTS = 10;

type TargetKind = "parents" | "students";

const fieldClass =
  "w-full rounded-2xl border border-border bg-background text-sm outline-none transition-colors placeholder:text-foreground/35 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15";

/** Map recipient-picker bulk selections to `{classId, kind}` circular targets. */
function selectionsToTargets(
  selections: PickerSelection[],
): Array<{ classId: string; kind: TargetKind }> {
  const byKey = new Map<string, { classId: string; kind: TargetKind }>();
  for (const item of selections) {
    if (item.type !== "bulk") continue;
    const kind = item.item.kind;
    const classId = item.item.filter.classId;
    if (!classId) continue;
    if (kind !== "parents" && kind !== "students") continue;
    byKey.set(`${classId}:${kind}`, { classId, kind });
  }
  return [...byKey.values()];
}

/**
 * Publish a circular (PDF) to the teacher's own groups. Mirrors the ERP publish
 * dialog but scoped to teacher groups (no school-wide broadcast).
 */
export function PublishCircularDialog({
  open,
  categories,
  groups,
  onClose,
  onPublished,
}: {
  open: boolean;
  categories: CircularCategory[];
  groups: CommsGroupWithGrade[];
  onClose: () => void;
  onPublished?: () => void;
}) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notifyRecipients, setNotifyRecipients] = useState(true);
  const [recipients, setRecipients] = useState<PickerSelection[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cloudImports, setCloudImports] = useState<CloudImportRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const targets = useMemo(() => selectionsToTargets(recipients), [recipients]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: t("comms.documents.uncategorized") },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories, t],
  );

  const attachmentCount = (file ? 1 : 0) + cloudImports.length;
  const remainingSlots = MAX_ATTACHMENTS - attachmentCount;

  function reset() {
    setTitle("");
    setDescription("");
    setCategoryId("");
    setNotifyRecipients(true);
    setRecipients([]);
    setFile(null);
    setCloudImports([]);
    setError(null);
    setCloudError(null);
  }

  function addLocalFiles(files: File[]) {
    const next = files[0];
    if (!next || file) return;
    setFile(next);
  }

  function addCloudImports(refs: CloudImportRef[]) {
    setCloudImports((current) => {
      const merged = [...current];
      for (const ref of refs) {
        if (attachmentsLength(merged, file) >= MAX_ATTACHMENTS) break;
        merged.push(ref);
      }
      return merged;
    });
  }

  const attachments: AttachmentDraft[] = useMemo(() => {
    const rows: AttachmentDraft[] = [];
    if (file) rows.push({ kind: "local", file });
    for (const ref of cloudImports) rows.push({ kind: "cloud", ref });
    return rows;
  }, [file, cloudImports]);

  async function submit() {
    if (saving) return;
    setError(null);
    if (!title.trim()) {
      setError(t("comms.documents.titleRequired"));
      return;
    }
    if (attachments.length === 0) {
      setError(t("comms.documents.attachmentRequired"));
      return;
    }
    if (targets.length === 0) {
      setError(t("comms.noRecipientsPick"));
      return;
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("categoryId", categoryId);
    formData.set("targets", JSON.stringify(targets));
    for (const item of attachments) {
      if (item.kind === "local") formData.set("file", item.file);
    }

    setSaving(true);
    try {
      const result = await publishTeacherCircular(formData);
      if (!result.ok) {
        setError(result.error || t("comms.error"));
        return;
      }
      reset();
      onClose();
      onPublished?.();
    } catch {
      setError(t("comms.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        title={t("comms.documents.circularPublishTitle")}
        onClose={() => {
          reset();
          onClose();
        }}
        panelClassName="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="h-11 rounded-2xl border border-border px-4 text-sm font-semibold text-foreground/70"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={saving || !title.trim() || targets.length === 0 || attachments.length === 0}
              onClick={() => void submit()}
              className={cn(
                "inline-flex h-11 min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white",
                "bg-[#0f766e] hover:bg-[#0d6b64] disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-foreground/40 disabled:hover:bg-foreground/10",
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("comms.documents.publishCircular")}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-foreground/55">{t("comms.documents.circularLead")}</p>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">
              {t("comms.documents.fieldTitle")}
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("comms.documents.titlePlaceholder")}
              maxLength={160}
              className={cn(fieldClass, "h-12 px-3.5 text-[15px]")}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">
              {t("comms.documents.fieldDescription")}
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("comms.documents.descriptionPlaceholder")}
              rows={2}
              maxLength={400}
              className={cn(fieldClass, "resize-none px-3.5 py-3")}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-foreground">
                {t("comms.documents.fieldRecipients")}
              </span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background px-3.5 text-left text-sm text-foreground/70 transition-colors hover:border-foreground/20"
              >
                <Users className="h-4 w-4 shrink-0 text-foreground/40" />
                {recipients.length > 0 ? (
                  <span className="truncate font-medium text-foreground">
                    {recipients
                      .map((item) => {
                        if (item.type === "contact") return item.name;
                        if (item.type === "collapsed") return item.label;
                        return item.item.label;
                      })
                      .join(", ")}
                  </span>
                ) : (
                  <span className="truncate">{t("comms.documents.recipientsPlaceholder")}</span>
                )}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-foreground">
                {t("comms.documents.fieldCategory")}
              </span>
              <Dropdown
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                ariaLabel={t("comms.documents.fieldCategory")}
                placeholder={t("comms.documents.uncategorized")}
                size="form"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold text-foreground">
                {t("comms.documents.attachmentsLabel")}
              </span>
              <span className="text-xs font-medium text-foreground/40">
                {attachments.length}/{MAX_ATTACHMENTS}
              </span>
            </div>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files.length > 0) {
                  addLocalFiles(Array.from(event.dataTransfer.files));
                }
              }}
              className="rounded-2xl border border-dashed border-border bg-surface-muted/25 px-3 py-4"
            >
              <p className="text-center text-sm text-foreground/60">
                {t("comms.documents.dropHint")}{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "font-semibold underline-offset-2 hover:underline",
                    messagesTone.accentText,
                  )}
                >
                  {t("comms.documents.browseFiles")}
                </button>
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCloudError(null);
                    fileInputRef.current?.click();
                  }}
                  className="flex h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-background px-2 text-[12px] font-semibold text-foreground/80 transition-colors hover:border-[#0f766e]/40 hover:bg-[#f4fbfa] dark:hover:bg-[#0f2f2c]/40"
                >
                  <FolderOpen className="h-6 w-6" strokeWidth={1.75} />
                  {t("comms.myDevice")}
                </button>
                <CloudImportSources
                  remainingSlots={remainingSlots}
                  disabled={saving}
                  onLocalFiles={addLocalFiles}
                  onCloudImports={addCloudImports}
                  onError={setCloudError}
                />
              </div>
              {cloudError ? (
                <p className="mt-3 text-center text-xs font-medium text-error">{cloudError}</p>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept={MESSAGE_ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) addLocalFiles([next]);
                  event.target.value = "";
                }}
              />
            </div>
            {attachments.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {attachments.map((item) => (
                  <li
                    key={attachmentDraftKey(item)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {item.kind === "cloud" ? (
                      <Cloud className="h-4 w-4 shrink-0 text-foreground/40" />
                    ) : (
                      <FolderOpen className="h-4 w-4 shrink-0 text-foreground/40" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {attachmentDraftLabel(item)}
                    </span>
                    <button
                      type="button"
                      aria-label={t("common.cancel")}
                      onClick={() => {
                        if (item.kind === "local") setFile(null);
                        else {
                          setCloudImports((current) =>
                            current.filter((ref) => ref !== item.ref),
                          );
                        }
                      }}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/45 hover:bg-surface-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-4 rounded-2xl bg-surface-muted/40 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {t("comms.documents.notifyRecipients")}
              </span>
              <span className="mt-0.5 block text-xs text-foreground/50">
                {t("comms.documents.notifyRecipientsHint")}
              </span>
            </span>
            <Switch
              checked={notifyRecipients}
              onChange={setNotifyRecipients}
              label={t("comms.documents.notifyRecipients")}
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-error/10 px-3 py-2 text-sm font-medium text-error">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>

      <RecipientPickerModal
        open={pickerOpen}
        contacts={[]}
        groups={groups}
        selected={recipients}
        onConfirm={(next) => {
          setRecipients(next);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
        mode="bulk"
        allowBulk
      />
    </>
  );
}

function attachmentsLength(cloud: CloudImportRef[], file: File | null): number {
  return (file ? 1 : 0) + cloud.length;
}
