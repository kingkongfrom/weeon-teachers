"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderOpen,
  Loader2,
  Paperclip,
  Save,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { CloudImportSources } from "@/components/comms/cloud-import-sources";
import { MessageBodyEditor } from "@/components/comms/message-body-editor";
import { MESSAGE_ATTACHMENT_ACCEPT } from "@/lib/comms/attachment-mime";
import {
  RecipientPickerModal,
  type PickerSelection,
} from "@/components/comms/recipient-picker-modal";
import { COMMS_MESSAGES } from "@/lib/comms/paths";
import { messagesTone } from "@/lib/comms/messages-tone";
import { docToPlainText, emptyDoc, type RichTextDoc } from "@/lib/comms/model";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import { recipientsFromBulkSelections } from "@/lib/comms/recipient-catalog";
import type { MessageDraftRecord } from "@/lib/comms/message-draft";
import {
  createMessageThread,
  deleteMessageDraft,
  saveMessageDraft,
  uploadMessageAttachment,
} from "@/lib/teachers/comms-actions";
import type { MessageContact } from "@/lib/dashboard/messages";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

const MAX_ATTACHMENTS = 10;

function selectionLabel(selection: PickerSelection): string {
  if (selection.type === "contact") return selection.name;
  return `${selection.item.label} · ${selection.item.subtitle}`;
}

export function UnifiedMessageComposer({
  contacts,
  groups,
  initialDraft = null,
}: {
  contacts: MessageContact[];
  groups: CommsGroupWithGrade[];
  initialDraft?: MessageDraftRecord | null;
}) {
  const t = useT();
  const router = useRouter();
  const [toSelected, setToSelected] = useState<PickerSelection[]>(
    () => (initialDraft?.toSelected ?? []) as PickerSelection[],
  );
  const [ccSelected, setCcSelected] = useState<Array<{ key: string; name: string }>>(
    () => initialDraft?.ccSelected ?? [],
  );
  const [pickerTarget, setPickerTarget] = useState<"to" | "cc" | null>(null);
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState<RichTextDoc>(() => initialDraft?.body ?? emptyDoc());
  const [files, setFiles] = useState<File[]>([]);
  const [allowReplies, setAllowReplies] = useState(initialDraft?.allowReplies ?? false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const sentRef = useRef(false);
  const skipDraftRef = useRef(false);
  const draftIdRef = useRef<string | null>(initialDraft?.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const snapRef = useRef({ subject, body, toSelected, ccSelected, allowReplies });
  snapRef.current = { subject, body, toSelected, ccSelected, allowReplies };

  const persistRef = useRef<(snap?: typeof snapRef.current) => Promise<void>>(async () => {});
  persistRef.current = async (snap = snapRef.current) => {
    if (skipDraftRef.current || sentRef.current) return;
    const res = await saveMessageDraft({
      id: draftIdRef.current,
      subject: snap.subject,
      body: snap.body,
      toSelected: snap.toSelected,
      ccSelected: snap.ccSelected,
      allowReplies: snap.allowReplies,
    });
    if (res.ok) draftIdRef.current = res.id;
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [subject, body, toSelected, ccSelected, allowReplies]);

  useEffect(
    () => () => {
      void persistRef.current();
    },
    [],
  );

  const remainingAttachmentSlots = MAX_ATTACHMENTS - files.length;

  function addFiles(incoming: FileList | File[]) {
    const picked = Array.from(incoming);
    if (picked.length === 0) return;
    setCloudError(null);
    setFiles((current) => {
      const merged = [...current];
      for (const file of picked) {
        if (merged.length >= MAX_ATTACHMENTS) break;
        merged.push(file);
      }
      return merged;
    });
  }

  const hasSubject = subject.trim().length > 0;
  const hasBody = docToPlainText(body).trim().length > 0;
  const hasContent = hasBody || files.length > 0;
  const hasTo = toSelected.length > 0;

  const canSend = hasSubject && hasContent && hasTo;

  async function send() {
    if (!canSend || sending || sentRef.current) return;
    setSending(true);
    setError(null);

    const bulkItems = toSelected.filter(
      (item): item is Extract<PickerSelection, { type: "bulk" }> => item.type === "bulk",
    );
    const toContacts = toSelected.filter(
      (item): item is Extract<PickerSelection, { type: "contact" }> => item.type === "contact",
    );

    if (bulkItems.length > 0 && (toContacts.length > 0 || ccSelected.length > 0)) {
      setSending(false);
      setError(t("comms.bulkMixError"));
      return;
    }

    let payload: Parameters<typeof createMessageThread>[0];

    if (bulkItems.length === 1) {
      const filter = bulkItems[0].item.filter;
      if (filter.reach === "class" && filter.classId) {
        payload = {
          subject,
          body,
          audience: "group",
          classId: filter.classId,
          allowReplies,
          recipientScope: filter.kind,
          broadcastFilter: null,
          recipients: [],
        };
      } else {
        payload = {
          subject,
          body,
          audience: "group",
          classId: null,
          allowReplies,
          recipientScope: null,
          broadcastFilter: filter,
          recipients: [],
        };
      }
    } else if (bulkItems.length > 1) {
      const expanded = recipientsFromBulkSelections(
        bulkItems.map((item) => item.item),
        contacts,
        groups,
      );
      if (expanded.length === 0) {
        setSending(false);
        setError(t("comms.noRecipientsPick"));
        return;
      }
      payload = {
        subject,
        body,
        audience: "individual",
        classId: null,
        allowReplies,
        recipientScope: null,
        broadcastFilter: null,
        recipients: expanded.map((item) => ({ ...item, role: "to" as const })),
      };
    } else {
      payload = {
        subject,
        body,
        audience: "individual",
        classId: null,
        allowReplies,
        recipientScope: null,
        broadcastFilter: null,
        recipients: [
          ...toContacts.map((item) => ({
            key: item.key,
            name: item.name,
            role: "to" as const,
          })),
          ...ccSelected.map((item) => ({
            key: item.key,
            name: item.name,
            role: "cc" as const,
          })),
        ],
      };
    }

    const res = await createMessageThread(payload);
    if (!res.ok || !res.threadId) {
      setSending(false);
      setError(res.ok ? t("comms.error") : res.error);
      return;
    }

    const threadId = res.threadId;
    for (const file of files) {
      const formData = new FormData();
      formData.set("threadId", threadId);
      formData.set("file", file);
      const uploaded = await uploadMessageAttachment(formData);
      if (!uploaded.ok) {
        setSending(false);
        setError(uploaded.error);
        return;
      }
    }

    sentRef.current = true;
    if (draftIdRef.current) void deleteMessageDraft(draftIdRef.current);
    router.replace(`${COMMS_MESSAGES}/${threadId}`);
    setSending(false);
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={COMMS_MESSAGES}
            className="ui-hover inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-foreground/60 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("comms.back")}
          </Link>
          <button
            type="button"
            onClick={() => {
              skipDraftRef.current = true;
              const id = draftIdRef.current;
              if (id) void deleteMessageDraft(id);
              router.push(COMMS_MESSAGES);
            }}
            className="ui-hover inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-error/80 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
            {t("comms.discard")}
          </button>
          <button
            type="button"
            onClick={() => {
              void persistRef.current().then(() => router.push(`${COMMS_MESSAGES}?folder=drafts`));
            }}
            className="ui-hover inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-foreground/70 hover:text-foreground"
          >
            <Save className="h-4 w-4" />
            {t("comms.saveDraft")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend || sending}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50",
            messagesTone.primaryButton,
          )}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? t("comms.sending") : t("comms.sendMessage")}
        </button>
      </div>

      <div className="flex flex-col gap-0 px-4 py-4">
        <RecipientRow
          label={t("comms.toField")}
          actionLabel={t("comms.addRecipient")}
          onAdd={() => setPickerTarget("to")}
        >
          {toSelected.map((item, index) => (
            <RecipientChip
              key={item.type === "bulk" ? item.item.id : item.key}
              label={selectionLabel(item)}
              onRemove={() =>
                setToSelected((current) => current.filter((_, i) => i !== index))
              }
            />
          ))}
        </RecipientRow>

        <RecipientRow
          label={t("comms.ccField")}
          actionLabel={t("comms.addCc")}
          onAdd={() => setPickerTarget("cc")}
          muted
        >
          {ccSelected.map((item) => (
            <RecipientChip
              key={item.key}
              label={item.name}
              onRemove={() =>
                setCcSelected((current) => current.filter((row) => row.key !== item.key))
              }
            />
          ))}
        </RecipientRow>

        <label className="flex items-center gap-3 border-b border-border py-3">
          <span className="w-16 shrink-0 text-sm font-semibold text-foreground/55">
            {t("comms.subject")}
          </span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={t("comms.subjectPlaceholderMessage")}
            maxLength={160}
            className={cn(inputClass, "border-0 bg-transparent px-0 focus:ring-0")}
          />
        </label>

        <MessageBodyEditor
          value={body}
          onChange={setBody}
          placeholder={t("comms.bodyPlaceholderMessage")}
          editorClassName="min-h-[16rem]"
          disabled={sending}
          inlineEmbeds={false}
        />

        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{t("comms.allowReplies")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={allowReplies}
            onClick={() => setAllowReplies((current) => !current)}
            className={cn(
              "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
              allowReplies ? messagesTone.toggleOn : "bg-foreground/20",
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out",
                allowReplies ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </label>

        <div
          className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted/30 px-6 py-8 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
          }}
        >
          <p className="text-sm font-medium text-foreground/55">{t("comms.dropFilesHint")}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {t("comms.documents.importFrom")}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              disabled={sending || remainingAttachmentSlots <= 0}
              onClick={() => {
                setCloudError(null);
                fileInputRef.current?.click();
              }}
              className="ui-hover flex min-w-[4.5rem] flex-col items-center gap-1 text-xs font-semibold text-foreground/60 hover:text-foreground disabled:opacity-50"
            >
              <FolderOpen className="h-8 w-8" />
              {t("comms.myDevice")}
            </button>
            <CloudImportSources
              remainingSlots={remainingAttachmentSlots}
              disabled={sending}
              onLocalFiles={addFiles}
              onError={setCloudError}
            />
          </div>
          {cloudError ? (
            <p className="mt-3 text-xs font-medium text-error">{cloudError}</p>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={MESSAGE_ATTACHMENT_ACCEPT}
            className="hidden"
            disabled={sending || remainingAttachmentSlots <= 0}
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {files.length > 0 ? (
            <ul className="mt-4 space-y-2 text-left">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Paperclip className="h-4 w-4 shrink-0 text-foreground/40" />
                    <span className="truncate font-medium">{file.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    className="text-foreground/40 hover:text-error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
      </div>

      <RecipientPickerModal
        open={pickerTarget === "to"}
        contacts={contacts}
        groups={groups}
        selected={toSelected}
        onConfirm={setToSelected}
        onClose={() => setPickerTarget(null)}
        allowBulk={ccSelected.length === 0}
      />

      <RecipientPickerModal
        open={pickerTarget === "cc"}
        contacts={contacts}
        groups={groups}
        selected={ccSelected.map((item) => ({ type: "contact" as const, ...item }))}
        onConfirm={(next) =>
          setCcSelected(
            next
              .filter((item): item is Extract<PickerSelection, { type: "contact" }> => item.type === "contact")
              .map((item) => ({ key: item.key, name: item.name })),
          )
        }
        onClose={() => setPickerTarget(null)}
        mode="regular"
        allowBulk={false}
      />
    </div>
  );
}

function RecipientRow({
  label,
  actionLabel,
  onAdd,
  muted = false,
  children,
}: {
  label: string;
  actionLabel: string;
  onAdd: () => void;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 border-b border-border py-3",
        muted && "opacity-90",
      )}
    >
      <span className="w-16 shrink-0 pt-1.5 text-sm font-semibold text-foreground/55">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
        <button
          type="button"
          onClick={onAdd}
          className="ui-hover inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-400/40 px-3.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300"
        >
          <UserPlus className="h-4 w-4" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function RecipientChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
      <span className="truncate text-xs font-semibold text-foreground/80">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-full text-foreground/40 hover:bg-error/10 hover:text-error"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
