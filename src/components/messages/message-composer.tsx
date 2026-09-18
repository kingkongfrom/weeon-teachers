"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { MessageBodyEditor } from "@/components/messages/message-body-editor";
import { RecipientPicker } from "@/components/messages/recipient-picker";
import { cn } from "@/lib/utils";
import { hubFilterChipClass } from "@/lib/dashboard/tones";
import { useT } from "@/lib/i18n/client";
import { docToPlainText, emptyDoc, type RichTextDoc } from "@/lib/assessments/model";
import { contactsForClassScope } from "@/lib/dashboard/message-contacts";
import { createMessageThread, uploadMessageAttachment } from "@/lib/teachers/message-actions";
import type { MessageContact } from "@/lib/dashboard/messages";

type GroupOption = { id: string; name: string; studentCount?: number; parentCount?: number };
type GroupScope = "parents" | "students";

/** Compose a one-way circular: people, class scope, or a hand-picked subset. */
export function MessageComposer({
  contacts,
  groups,
}: {
  contacts: MessageContact[];
  groups: GroupOption[];
}) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();

  const [audience, setAudience] = useState<"individual" | "group">("individual");
  const [selected, setSelected] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [classId, setClassId] = useState(groups[0]?.id ?? "");
  const [groupScope, setGroupScope] = useState<GroupScope>("parents");
  const [groupSelected, setGroupSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState<RichTextDoc>(() => emptyDoc());
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentRef = useRef(false);

  const contactByKey = new Map(contacts.map((contact) => [contact.key, contact]));
  const hasSubject = subject.trim().length > 0;
  const hasBody = docToPlainText(body).trim().length > 0;
  const hasContent = hasBody || files.length > 0;

  const selectedGroup = groups.find((group) => group.id === classId);
  const groupName = selectedGroup?.name ?? "";

  const classContacts = useMemo(
    () => contactsForClassScope(contacts, classId, groupName, groupScope),
    [contacts, classId, groupName, groupScope],
  );

  const wholeGroupCount =
    classContacts.length > 0
      ? classContacts.length
      : groupScope === "parents"
        ? (selectedGroup?.parentCount ?? 0)
        : (selectedGroup?.studentCount ?? 0);

  const canSend =
    hasSubject &&
    hasContent &&
    (audience === "group"
      ? classId.length > 0 && (groupSelected.length > 0 || wholeGroupCount > 0)
      : selected.length > 0);

  const groupSummary =
    groupSelected.length > 0
      ? m.groupSubset(groupSelected.length)
      : groupScope === "parents"
        ? m.groupWholeParents(wholeGroupCount)
        : m.groupWholeStudents(wholeGroupCount);

  async function send() {
    if (!canSend || sending || sentRef.current) return;
    setSending(true);
    setError(null);

    const recipients =
      audience === "group"
        ? groupSelected.map((key) => ({ key, name: contactByKey.get(key)?.name ?? "" }))
        : selected.map((key) => ({ key, name: contactByKey.get(key)?.name ?? "" }));

    const res = await createMessageThread({
      subject,
      body,
      audience,
      classId: audience === "group" ? classId : null,
      recipientScope: audience === "group" && groupSelected.length === 0 ? groupScope : null,
      recipients,
    });
    if (!res.ok || !res.threadId) {
      setSending(false);
      setError(res.ok ? m.error : res.error);
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
    router.replace(`/comunicacion/circulares/${threadId}`);
    setSending(false);
  }

  const inputClass =
    "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "individual", label: m.audienceIndividual },
            { id: "group", label: m.audienceGroup },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setAudience(option.id);
              setGroupSelected([]);
            }}
            className={cn(
              "h-9 rounded-full px-3.5 text-sm font-semibold transition-colors",
              hubFilterChipClass("purple", audience === option.id),
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {audience === "group" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/60">{m.pickGroup}</span>
            {groups.length > 0 ? (
              <Dropdown
                value={classId}
                onChange={(value) => {
                  setClassId(value);
                  setGroupSelected([]);
                }}
                options={groups.map((group) => ({ value: group.id, label: group.name }))}
                ariaLabel={m.pickGroup}
              />
            ) : (
              <p className="text-sm font-medium text-foreground/50">{m.emptyBody}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/60">{m.groupRecipientScope}</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "parents", label: m.kindParent },
                  { id: "students", label: m.kindStudent },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setGroupScope(option.id);
                    setGroupSelected([]);
                  }}
                  className={cn(
                    "h-9 rounded-full px-3.5 text-sm font-semibold transition-colors",
                    hubFilterChipClass("purple", groupScope === option.id),
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3">
            <p className="text-sm font-medium text-foreground/70">{groupSummary}</p>
            <div className="flex flex-wrap items-center gap-2">
              {groupSelected.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"
                >
                  <span className="max-w-[220px] truncate text-xs font-semibold text-foreground/80">
                    {contactByKey.get(key)?.name ?? "Destinatario"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroupSelected((current) => current.filter((item) => item !== key))}
                    aria-label={m.remove}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-error/10 hover:text-error"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="ui-hover inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-sm font-semibold text-foreground/60 hover:text-foreground"
              >
                <UserPlus className="h-4 w-4" />
                {groupSelected.length > 0 ? m.editGroupRecipients : m.pickGroupRecipients}
              </button>
              {groupSelected.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setGroupSelected([])}
                  className="text-xs font-semibold text-foreground/45 hover:underline"
                >
                  {m.useWholeGroup}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-foreground/60">{m.audience}</span>
          <div className="flex flex-wrap items-center gap-2">
            {selected.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5"
              >
                <span className="max-w-[220px] truncate text-xs font-semibold text-foreground/80">
                  {contactByKey.get(key)?.name ?? "Destinatario"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected((current) => current.filter((item) => item !== key))}
                  aria-label={m.remove}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-error/10 hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="ui-hover inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-sm font-semibold text-foreground/60 hover:text-foreground"
            >
              <UserPlus className="h-4 w-4" />
              {m.addRecipient}
            </button>
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">
          {m.subject} <span className="text-error">*</span>
        </span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={m.subjectPlaceholder}
          maxLength={160}
          required
          aria-required="true"
          className={inputClass}
        />
      </label>

      <MessageBodyEditor
        label={m.body}
        value={body}
        onChange={setBody}
        placeholder={m.bodyPlaceholder}
        editorClassName="min-h-[14rem]"
        files={files}
        onFilesChange={setFiles}
        disabled={sending}
      />

      <p className="text-sm text-foreground/60">{m.oneWayHint}</p>

      {error ? (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={() => void send()} disabled={!canSend || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {sending ? m.sending : m.send}
        </Button>
      </div>

      <RecipientPicker
        open={pickerOpen}
        contacts={contacts}
        selected={audience === "group" ? groupSelected : selected}
        onConfirm={audience === "group" ? setGroupSelected : setSelected}
        onClose={() => setPickerOpen(false)}
        kindFilter={
          audience === "group" ? (groupScope === "parents" ? "parent" : "student") : "all"
        }
        classId={audience === "group" ? classId : null}
        groupName={audience === "group" ? groupName : null}
        title={audience === "group" ? m.pickGroupRecipients : undefined}
      />
    </div>
  );
}
