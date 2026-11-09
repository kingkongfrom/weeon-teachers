"use client";

import { useState } from "react";

import { useLiveT } from "@/lib/i18n/client";

/**
 * One short observation per student, saved with the class report.
 *
 * WHY A SEPARATE LIST RATHER THAN INLINE ROWS
 *   The preview above is a read-only snapshot of grades, conduct and attendance, and it
 *   is a shipped surface. Threading an editable field through every one of its rows would
 *   restructure it for a feature that only needs a textarea per child. A compact list
 *   directly above the submit button keeps the preview intact and puts every student on
 *   one screen, which is faster to fill than hunting rows in a long preview.
 *
 * WHAT IT IS FOR
 *   `summary.teacherNotes` on the report is ONE note about the whole group. This is the
 *   per-child observation the student file has never had - the reason the MEP expediente
 *   asks for "observaciones relevantes para el próximo curso lectivo".
 *
 * COLLAPSED BY DEFAULT
 *   Every teacher sees this list on every report, but most reports need no per-student
 *   note. It starts closed with a count of what is already written, so the composer looks
 *   unchanged until a teacher opens it.
 */
export function ReportStudentNotes({
  students,
  initialNotes,
  onChange,
}: {
  /** Already sorted for display by the caller. */
  students: { id: string; name: string }[];
  /** Notes already saved for this report, keyed by student id. */
  initialNotes: Record<string, string>;
  onChange: (notes: Record<string, string>) => void;
}) {
  const t = useLiveT();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);

  const written = students.filter((student) => (notes[student.id] ?? "").trim().length > 0).length;

  function update(studentId: string, value: string) {
    const next = { ...notes, [studentId]: value };
    setNotes(next);
    onChange(next);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t.composer.studentNotesLabel}</h2>
          <p className="mt-1 text-xs font-medium text-foreground/50">
            {t.composer.studentNotesHint}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
        >
          {open
            ? t.composer.studentNotesHide
            : written > 0
              ? t.composer.studentNotesShowWritten(written)
              : t.composer.studentNotesShow}
        </button>
      </div>

      {open ? (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {students.map((student) => {
            const id = `student-note-${student.id}`;
            return (
              <li key={student.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <label htmlFor={id} className="text-sm font-medium text-foreground">
                  {student.name}
                </label>
                <textarea
                  id={id}
                  value={notes[student.id] ?? ""}
                  onChange={(event) => update(student.id, event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder={t.composer.studentNotePlaceholder}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-brand-400"
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
