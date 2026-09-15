"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { submitClassReport } from "@/lib/teachers/reports-actions";
import { useT } from "@/lib/i18n/client";

type ReportComposerSubmitProps = {
  classId: string;
  subjectId: string | null;
};

export function ReportComposerSubmit({ classId, subjectId }: ReportComposerSubmitProps) {
  const t = useT();
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await submitClassReport({
      classId,
      subjectId,
      teacherNotes: notes.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/reportes");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <label htmlFor="report-notes" className="block text-sm font-semibold text-foreground">
        {t.composer.notesLabel}
      </label>
      <p className="mt-1 text-xs font-medium text-foreground/50">{t.composer.notesHint}</p>
      <textarea
        id="report-notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={2000}
        rows={4}
        placeholder={t.composer.notesPlaceholder}
        className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      />

      {error ? <p className="mt-3 text-xs font-medium text-error">{error}</p> : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Link
          href={`/grupos/${classId}`}
          className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface-muted"
        >
          {t.composer.cancel}
        </Link>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? t.composer.submitting : t.composer.submit}
        </button>
      </div>
    </section>
  );
}
