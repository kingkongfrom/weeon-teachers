"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/assessments/rich-text";
import { AttachmentDropzone } from "@/components/messages/attachment-dropzone";
import { RecipientPicker } from "@/components/messages/recipient-picker";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { docToPlainText, emptyDoc, type RichTextDoc } from "@/lib/assessments/model";
import { createMessageThread, uploadMessageAttachment } from "@/lib/teachers/message-actions";
import type { MessageContact } from "@/lib/dashboard/messages";

type GroupOption = { id: string; name: string };

/** Compose an email-style message: people or a group, subject, rich body, files. */
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
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState<RichTextDoc>(() => emptyDoc());
  const [files, setFiles] = useState<File[]>([]);
  const [allowReplies, setAllowReplies] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactByKey = new Map(contacts.map((contact) => [contact.key, contact]));
  const hasBody = docToPlainText(body).trim().length > 0;
  const canSend = hasBody && (audience === "group" ? classId.length > 0 : selected.length > 0);

  async function send() {
    if (!canSend || sending) return;
    setSending(true);
    setError(null);
    const res = await createMessageThread({
      subject,
      body,
      audience,
      classId: audience === "group" ? classId : null,
      recipients:
        audience === "group"
          ? []
          : selected.map((key) => ({ key, name: contactByKey.get(key)?.name ?? "" })),
      allowReplies,
    });
    if (!res.ok || !res.threadId) {
      setSending(false);
      setError(res.ok ? m.error : res.error);
      return;
    }

    for (const file of files) {
      const formData = new FormData();
      formData.set("threadId", res.threadId);
      formData.set("file", file);
      const uploaded = await uploadMessageAttachment(formData);
      if (!uploaded.ok) {
        setError(uploaded.error);
        break;
      }
    }

    setSending(false);
    router.push(`/comunicacion/${res.threadId}`);
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
            onClick={() => setAudience(option.id)}
            className={cn(
              "h-9 rounded-full px-3.5 text-sm font-semibold transition-colors",
              audience === option.id
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                : "text-foreground/60 hover:bg-surface-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {audience === "group" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">{m.pickGroup}</span>
          {groups.length > 0 ? (
            <Dropdown
              value={classId}
              onChange={setClassId}
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
              ariaLabel={m.pickGroup}
            />
          ) : (
            <p className="text-sm font-medium text-foreground/50">{m.emptyBody}</p>
          )}
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
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
            >
              <UserPlus className="h-4 w-4" />
              {m.addRecipient}
            </button>
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{m.subject}</span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={m.subjectPlaceholder}
          maxLength={160}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{m.body}</span>
        <RichTextEditor value={body} onChange={setBody} placeholder={m.bodyPlaceholder} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground/70">{m.allowReplies}</span>
        <Switch checked={allowReplies} onChange={setAllowReplies} label={m.allowReplies} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{m.attach}</span>
        <AttachmentDropzone files={files} onChange={setFiles} disabled={sending} />
      </div>

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
        selected={selected}
        onConfirm={setSelected}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
