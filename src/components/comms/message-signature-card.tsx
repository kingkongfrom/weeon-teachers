"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MessageBodyEditor } from "@/components/comms/message-body-editor";
import type { RichTextDoc } from "@/lib/comms/model";
import { saveMessageMailboxSettings } from "@/lib/teachers/comms-actions";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import { messagesTone } from "@/lib/comms/messages-tone";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

export function MessageSignatureCard({
  initialSettings,
}: {
  initialSettings: MessageMailboxSettings;
}) {
  const t = useT();
  const [body, setBody] = useState<RichTextDoc>(() => initialSettings.signatureBody);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    const res = await saveMessageMailboxSettings({ signatureBody: body });
    setBusy(false);
    if (!res.ok) return;
    setSaved(true);
  }

  return (
    <section
      id="message-signature"
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-foreground">{t("settings.messageSignature.title")}</h2>
      <p className="mt-1 text-sm font-medium text-foreground/55">
        {t("settings.messageSignature.description")}
      </p>
      <div className="mt-4">
        <MessageBodyEditor
          label={t("settings.messageSignature.title")}
          value={body}
          onChange={setBody}
          placeholder={t("comms.signaturePlaceholder")}
          editorClassName="min-h-[10rem] rte-content-signature"
          inlineEmbeds={false}
        />
        <p className="mt-2 text-xs font-medium text-foreground/50">{t("comms.signatureHint")}</p>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved ? (
          <span className="text-sm font-medium text-emerald-600">{t("settings.messageSignature.saved")}</span>
        ) : null}
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50",
            messagesTone.primaryButton,
          )}
          disabled={busy}
          onClick={() => void onSave()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("settings.messageSignature.save")}
        </button>
      </div>
    </section>
  );
}
