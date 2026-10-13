"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { ComposeActionBar } from "@/components/comms/compose-action-bar";
import { ComposeAttachmentStrip } from "@/components/comms/compose-attachment-strip";
import { MessageBodyEditor } from "@/components/comms/message-body-editor";
import { ComposeParaRecipientField } from "@/components/comms/compose-para-recipient-field";
import {
  ComposeThreadQuotedSection,
  ComposeThreadReadPhase,
} from "@/components/comms/compose-thread-read-phase";
import {
  RecipientPickerModal,
  type PickerSelection,
} from "@/components/comms/recipient-picker-modal";
import { ensureForwardSubject } from "@/lib/comms/compose-display-utils";
import { COMMS_MESSAGES } from "@/lib/comms/paths";
import { docToPlainText, emptyDoc, type RichTextDoc } from "@/lib/comms/model";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import { recipientsFromBulkSelections } from "@/lib/comms/recipient-catalog";
import {
  createMessageThread,
  deleteMessageDraft,
  saveMessageDraft,
  uploadMessageAttachment,
} from "@/lib/teachers/comms-actions";
import type { MessageDraftRecord } from "@/lib/comms/message-draft";
import type { MessageContact } from "@/lib/dashboard/messages";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

/** Matches `composeSchema.recipients.max` in comms-actions. */
const COMPOSE_RECIPIENT_MAX = 500;
const MAX_ATTACHMENTS = 10;

function selectionLabel(selection: PickerSelection): string {
  if (selection.type === "contact") return selection.name;
  if (selection.type === "collapsed") return selection.label;
  return `${selection.item.label} · ${selection.item.subtitle}`;
}

export function UnifiedMessageComposer({
  contacts,
  groups,
  initialDraft = null,
  variant = "page",
  persistDraft = true,
  onSent,
  onDiscard,
  realtime = null,
  fromLabel = "",
}: {
  contacts: MessageContact[];
  groups: CommsGroupWithGrade[];
  initialDraft?: MessageDraftRecord | null;
  variant?: "page" | "mailbox";
  persistDraft?: boolean;
  onSent?: (threadId: string) => void;
  onDiscard?: () => void;
  realtime?: RealtimeConfig | null;
  fromLabel?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [toSelected, setToSelected] = useState<PickerSelection[]>(
    () => (initialDraft?.toSelected ?? []) as PickerSelection[],
  );
  const [ccSelected, setCcSelected] = useState<Array<{ key: string; name: string }>>(
    () => initialDraft?.ccSelected ?? [],
  );
  const [ccRowVisible, setCcRowVisible] = useState(
    () => (initialDraft?.ccSelected?.length ?? 0) > 0,
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
  const sourceThreadHistory = initialDraft?.sourceThreadHistory ?? null;
  const hasThreadReadPhase = (sourceThreadHistory?.length ?? 0) > 0;
  const threadSeedRef = useRef({
    to: (initialDraft?.toSelected ?? []) as PickerSelection[],
    cc: initialDraft?.ccSelected ?? [],
  });
  const [replyExpanded, setReplyExpanded] = useState(!hasThreadReadPhase);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function expandReply(mode: "reply" | "reply-all") {
    setToSelected(threadSeedRef.current.to);
    const cc = mode === "reply-all" ? threadSeedRef.current.cc : [];
    setCcSelected(cc);
    setCcRowVisible(cc.length > 0);
    setReplyExpanded(true);
  }

  function expandForward() {
    setToSelected([]);
    setCcSelected([]);
    setCcRowVisible(false);
    setSubject((current) => ensureForwardSubject(current));
    setReplyExpanded(true);
  }

  function ccSelectionsFromState(): PickerSelection[] {
    return ccSelected.map((item) => ({ type: "contact" as const, ...item }));
  }

  function applyCcSelections(next: PickerSelection[]) {
    setCcSelected(
      next
        .filter((item): item is Extract<PickerSelection, { type: "contact" }> => item.type === "contact")
        .map((item) => ({ key: item.key, name: item.name })),
    );
  }
  const snapRef = useRef({ subject, body, toSelected, ccSelected, allowReplies });
  snapRef.current = { subject, body, toSelected, ccSelected, allowReplies };

  const persistRef = useRef<(snap?: typeof snapRef.current) => Promise<void>>(async () => {});
  persistRef.current = async (snap = snapRef.current) => {
    if (!persistDraft || skipDraftRef.current || sentRef.current) return;
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
    if (!persistDraft) return;
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [persistDraft, subject, body, toSelected, ccSelected, allowReplies]);

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
    const collapsedTo = toSelected.filter(
      (item): item is Extract<PickerSelection, { type: "collapsed" }> => item.type === "collapsed",
    );

    if (
      bulkItems.length > 0 &&
      (toContacts.length > 0 || collapsedTo.length > 0 || ccSelected.length > 0)
    ) {
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
      if (expanded.length > COMPOSE_RECIPIENT_MAX) {
        setSending(false);
        setError(t("comms.tooManyRecipients"));
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
          ...collapsedTo.flatMap((group) =>
            group.members.map((item) => ({
              key: item.key,
              name: item.name,
              role: "to" as const,
            })),
          ),
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
    if (draftIdRef.current && persistDraft) void deleteMessageDraft(draftIdRef.current);
    if (onSent) {
      onSent(threadId);
      router.refresh();
    } else {
      router.replace(`${COMMS_MESSAGES}?folder=sent&thread=${threadId}`);
      router.refresh();
    }
    setSending(false);
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

  const mailbox = variant === "mailbox";

  function discardCompose() {
    skipDraftRef.current = true;
    const id = draftIdRef.current;
    if (id && persistDraft) void deleteMessageDraft(id);
    if (onDiscard) {
      onDiscard();
      return;
    }
    router.push(COMMS_MESSAGES);
  }

  const toolbarBtn =
    "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors sm:px-3";
  const sendDisabled =
    sending || !canSend || (hasThreadReadPhase && !replyExpanded);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-0 bg-surface",
        mailbox ? "h-full flex-1" : "min-h-0 flex-1",
      )}
    >
      <div className="sticky top-0 z-20 -mx-1 overflow-visible border-b border-border/60 bg-surface/95 px-1 py-2.5 backdrop-blur-sm sm:-mx-2 sm:px-2">
        <div className="flex flex-wrap items-center gap-2 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2">
            {mailbox ? null : (
              <Link
                href={COMMS_MESSAGES}
                className={cn(
                  toolbarBtn,
                  "text-foreground/65 hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("comms.back")}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={discardCompose}
              className={cn(toolbarBtn, "text-error/90 hover:bg-error/5")}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t("comms.discard")}</span>
            </button>
            {persistDraft ? (
              <button
                type="button"
                onClick={() => {
                  void persistRef.current().then(() =>
                    router.push(`${COMMS_MESSAGES}?folder=drafts`),
                  );
                }}
                className={cn(
                  toolbarBtn,
                  "text-foreground/65 hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Save className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("comms.saveDraft")}</span>
              </button>
            ) : null}
          </div>

          <div className="min-w-3 flex-1" aria-hidden />

          {hasThreadReadPhase && !replyExpanded ? (
            <ComposeActionBar
              onReply={() => expandReply("reply")}
              onReplyAll={() => expandReply("reply-all")}
              onForward={() => expandForward()}
            />
          ) : null}

          {hasThreadReadPhase && !replyExpanded ? null : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={sendDisabled}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#0891B2] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-foreground/40 disabled:shadow-none"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? t("comms.sending") : t("comms.sendMessage")}
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pt-4">
        {hasThreadReadPhase && sourceThreadHistory ? (
          <ComposeThreadReadPhase
            subject={subject}
            messages={sourceThreadHistory}
            deferQuotedThread={replyExpanded}
            replyEditor={
              replyExpanded ? (
                <>
                  <ComposeEmailFields
                    subject={subject}
                    onSubjectChange={setSubject}
                    subjectPlaceholder={t("comms.subjectPlaceholderMessage")}
                    inputClass={inputClass}
                    fromLabel={fromLabel}
                    fromFieldLabel={t("comms.from")}
                    toLabel={t("comms.toField")}
                    ccLabel={t("comms.ccField")}
                    subjectLabel={t("comms.subject")}
                    onPickTo={() => setPickerTarget("to")}
                    onPickCc={() => setCcRowVisible(true)}
                    toField={
                      <ComposeParaRecipientField
                        contacts={contacts}
                        selections={toSelected}
                        onChange={setToSelected}
                        onOpenPicker={() => setPickerTarget("to")}
                        realtime={realtime}
                        disabled={sending}
                      />
                    }
                    ccField={
                      <ComposeParaRecipientField
                        contacts={contacts}
                        selections={ccSelectionsFromState()}
                        onChange={applyCcSelections}
                        onOpenPicker={() => setPickerTarget("cc")}
                        realtime={realtime}
                        disabled={sending}
                      />
                    }
                    showCcRow={ccRowVisible || ccSelected.length > 0}
                  />
                  <MessageBodyEditor
                    value={body}
                    onChange={setBody}
                    placeholder={t("comms.bodyPlaceholderMessage")}
                    editorClassName="min-h-[14rem] border-0"
                    disabled={sending}
                    inlineEmbeds={false}
                  />
                </>
              ) : null
            }
          />
        ) : replyExpanded ? (
          <>
            <ComposeEmailFields
              subject={subject}
              onSubjectChange={setSubject}
              subjectPlaceholder={t("comms.subjectPlaceholderMessage")}
              inputClass={inputClass}
              fromLabel={fromLabel}
              fromFieldLabel={t("comms.from")}
              toLabel={t("comms.toField")}
              ccLabel={t("comms.ccField")}
              subjectLabel={t("comms.subject")}
              onPickTo={() => setPickerTarget("to")}
              onPickCc={() => setCcRowVisible(true)}
              toField={
                <ComposeParaRecipientField
                  contacts={contacts}
                  selections={toSelected}
                  onChange={setToSelected}
                  onOpenPicker={() => setPickerTarget("to")}
                  realtime={realtime}
                  disabled={sending}
                />
              }
              ccField={
                <ComposeParaRecipientField
                  contacts={contacts}
                  selections={ccSelectionsFromState()}
                  onChange={applyCcSelections}
                  onOpenPicker={() => setPickerTarget("cc")}
                  realtime={realtime}
                  disabled={sending}
                />
              }
              showCcRow={ccRowVisible || ccSelected.length > 0}
            />
            <MessageBodyEditor
              value={body}
              onChange={setBody}
              placeholder={t("comms.bodyPlaceholderMessage")}
              editorClassName="min-h-[16rem] border-0"
              disabled={sending}
              inlineEmbeds={false}
            />
          </>
        ) : null}

        {replyExpanded ? (
          <>
        <ComposeAttachmentStrip
          allowReplies={allowReplies}
          onAllowRepliesChange={setAllowReplies}
          files={files}
          onRemoveFile={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
          onAddFiles={addFiles}
          sending={sending}
          remainingAttachmentSlots={remainingAttachmentSlots}
          cloudError={cloudError}
          onCloudError={setCloudError}
          fileInputRef={fileInputRef}
        />

        {error ? (
          <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}

        {hasThreadReadPhase && sourceThreadHistory && replyExpanded ? (
          <ComposeThreadQuotedSection
            messages={sourceThreadHistory}
            subject={subject}
            replying
          />
        ) : null}
          </>
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

/** Classic email header rows (Para / Cc / Asunto). */
function ComposeEmailFields({
  fromLabel = "",
  fromFieldLabel = "",
  toLabel,
  ccLabel,
  subjectLabel,
  subject,
  onSubjectChange,
  subjectPlaceholder,
  inputClass,
  onPickTo,
  onPickCc,
  toField,
  ccField,
  showCcRow,
  showSubjectRow = true,
}: {
  fromLabel?: string;
  fromFieldLabel?: string;
  toLabel: string;
  ccLabel: string;
  subjectLabel: string;
  subject: string;
  onSubjectChange: (value: string) => void;
  subjectPlaceholder: string;
  inputClass: string;
  onPickTo: () => void;
  onPickCc: () => void;
  toField: React.ReactNode;
  ccField: React.ReactNode;
  showCcRow: boolean;
  showSubjectRow?: boolean;
}) {
  const fieldLabel = "w-[3.25rem] shrink-0 pt-0.5 text-xs font-semibold text-foreground/45 sm:w-14";
  const rowClass = "flex min-h-[2.25rem] items-start gap-2 border-b border-border/45 py-1.5";

  return (
    <div className="mb-1 rounded-lg border border-border/50 bg-surface-muted/20 px-3 py-0.5 sm:px-4">
      {fromLabel ? (
        <div className={cn(rowClass, "items-center py-2")}>
          <span className={cn(fieldLabel, "pt-0")}>{fromFieldLabel}</span>
          <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground/85">
            {fromLabel}
          </span>
        </div>
      ) : null}
      <div className={rowClass}>
        <span className={fieldLabel}>{toLabel}</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{toField}</div>
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          <button
            type="button"
            onClick={onPickCc}
            className="rounded-md px-1.5 py-1 text-xs font-medium text-foreground/45 hover:bg-surface-muted hover:text-foreground"
          >
            {ccLabel}
          </button>
          <button
            type="button"
            onClick={onPickTo}
            className="rounded-md p-1 text-foreground/45 hover:bg-surface-muted hover:text-foreground"
            aria-label={toLabel}
          >
            <UserPlus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showCcRow ? (
        <div className={rowClass}>
          <span className={fieldLabel}>{ccLabel}</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{ccField}</div>
        </div>
      ) : null}
      {showSubjectRow ? (
        <label className={cn(rowClass, "items-center py-2")}>
          <span className={cn(fieldLabel, "pt-0")}>{subjectLabel}</span>
          <input
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder={subjectPlaceholder}
            maxLength={160}
            className={cn(inputClass, "h-8 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm focus:ring-0")}
          />
        </label>
      ) : null}
    </div>
  );
}

function RecipientChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface px-2 py-0.5 ring-1 ring-border/60">
      <span className="truncate text-xs font-medium text-foreground/85">{label}</span>
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
