"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Loader2,
  Minus,
  Plus,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Dropdown } from "@/components/ui/dropdown";
import { TONE_PILL } from "@/lib/dashboard/tones";
import {
  categoriesForKind,
  defaultCategoryForKind,
  isCategoryValidForKind,
  signedPoints,
  summarizeConduct,
  type ConductCategory,
  type ConductKind,
  type ConductRecord,
} from "@/lib/conduct/model";
import { EducationalSupportBadgeButton } from "@/components/educational-supports/support-badge-button";
import { EducationalSupportReviewDialog } from "@/components/educational-supports/support-review-dialog";
import type {
  ClassEducationalSupportFlags,
  EducationalSupport,
} from "@/lib/educational-supports/model";
import { addConductRecord, deleteConductRecord } from "@/lib/teachers/conduct-actions";
import { fetchStudentEducationalSupports } from "@/lib/teachers/educational-support-actions";
import type { TeacherStudent } from "@/lib/dashboard/grupos";

function studentName(student: TeacherStudent): string {
  return `${student.lastName} ${student.firstName}`.trim();
}

function formatDate(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function netTint(net: number): string {
  if (net > 0) return "text-emerald-700 dark:text-emerald-300";
  if (net < 0) return "text-rose-700 dark:text-rose-300";
  return "text-foreground/45";
}

/** Código de conducta — méritos/faltas log separate from the grade spreadsheet. */
export function ConductWorkspace({
  classId,
  groupName,
  students,
  initialRecords,
  locale,
  supportFlags = {},
}: {
  classId: string;
  groupName: string;
  students: TeacherStudent[];
  initialRecords: ConductRecord[];
  locale: string;
  supportFlags?: ClassEducationalSupportFlags;
}) {
  const t = useT();
  const router = useRouter();
  const c = t.conduct;
  const [records, setRecords] = useState(initialRecords);
  const [query, setQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<string | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConductRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState(supportFlags);
  const [reviewStudent, setReviewStudent] = useState<{
    id: string;
    name: string;
    supports: EducationalSupport[];
  } | null>(null);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    setLocalFlags(supportFlags);
  }, [supportFlags]);

  async function openSupportReview(student: TeacherStudent) {
    const res = await fetchStudentEducationalSupports(student.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReviewStudent({
      id: student.id,
      name: studentName(student),
      supports: res.supports,
    });
  }

  function markSupportReviewed(studentId: string) {
    setLocalFlags((prev) => {
      const current = prev[studentId];
      if (!current) return prev;
      return {
        ...prev,
        [studentId]: { ...current, needsReview: false },
      };
    });
  }

  const summaries = useMemo(() => summarizeConduct(records), [records]);

  const visibleStudents = students.filter((student) =>
    studentName(student).toLowerCase().includes(query.trim().toLowerCase()),
  );

  const filteredRecords = records.filter((row) => {
    if (studentFilter !== "all" && row.studentId !== studentFilter) return false;
    if (query.trim()) {
      const student = students.find((s) => s.id === row.studentId);
      if (!student) return false;
      return studentName(student).toLowerCase().includes(query.trim().toLowerCase());
    }
    return true;
  });

  async function handleCreate(payload: {
    studentId: string;
    occurredOn: string;
    kind: ConductKind;
    category: ConductCategory;
    description: string;
    points: number;
  }) {
    setError(null);
    if (localFlags[payload.studentId]?.needsReview) {
      const student = students.find((row) => row.id === payload.studentId);
      if (student) {
        await openSupportReview(student);
      }
      return false;
    }
    const res = await addConductRecord({ classId, ...payload });
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteConductRecord({ classId, recordId: deleteTarget.id });
    setDeleting(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRecords((current) => current.filter((row) => row.id !== deleteTarget.id));
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="brand-page-title text-3xl font-bold text-foreground sm:text-4xl">
            {groupName}
          </h1>
          <p className="mt-0.5 text-sm font-medium text-foreground/55">{c.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={students.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {c.addEntry}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative inline-flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={c.search}
            className="h-9 w-60 rounded-full border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand-400"
          />
        </label>
        <div className="min-w-[12rem]">
          <Dropdown
            value={studentFilter}
            onChange={setStudentFilter}
            ariaLabel={c.allStudents}
            placeholder={c.allStudents}
            options={[
              { value: "all", label: c.allStudents },
              ...students.map((student) => ({
                value: student.id,
                label: studentName(student),
              })),
            ]}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-2.5 text-sm font-medium text-error">
          {error}
        </div>
      ) : null}

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm font-medium text-foreground/50">
          {c.noStudents}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/45">
              {c.summaryTitle}
            </h2>
            <div className="overflow-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-foreground/50">
                    <th className="px-4 py-3">{c.student}</th>
                    <th className="px-4 py-3 text-center">{c.merits}</th>
                    <th className="px-4 py-3 text-center">{c.demerits}</th>
                    <th className="px-4 py-3 text-center">{c.netPoints}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => {
                    const summary = summaries.get(student.id) ?? {
                      studentId: student.id,
                      meritCount: 0,
                      demeritCount: 0,
                      netPoints: 0,
                    };
                    return (
                      <tr key={student.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Link
                              href={`/estudiantes/${student.id}?from=${encodeURIComponent(`/grupos/${classId}?tab=conducta`)}`}
                              className="min-w-0 truncate font-medium text-foreground transition-colors hover:text-[#7c3aed] dark:hover:text-[#b9a3f7]"
                            >
                              {studentName(student)}
                            </Link>
                            <EducationalSupportBadgeButton
                              count={localFlags[student.id]?.activeCount ?? 0}
                              needsReview={localFlags[student.id]?.needsReview ?? false}
                              onClick={() => void openSupportReview(student)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums">
                          <span className={cn("rounded-md px-2 py-0.5 font-semibold", TONE_PILL.green)}>
                            {summary.meritCount}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums">
                          <span className={cn("rounded-md px-2 py-0.5 font-semibold", TONE_PILL.rose)}>
                            {summary.demeritCount}
                          </span>
                        </td>
                        <td className={cn("px-4 py-2.5 text-center text-base font-bold tabular-nums", netTint(summary.netPoints))}>
                          {summary.netPoints > 0 ? `+${summary.netPoints}` : summary.netPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/45">
              {c.logTitle}
            </h2>
            {filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                <Shield className="h-8 w-8 text-foreground/25" strokeWidth={1.75} />
                <p className="text-sm font-medium text-foreground/55">{c.emptyLog}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {filteredRecords.map((row) => {
                  const student = students.find((s) => s.id === row.studentId);
                  const signed = signedPoints(row.kind, row.points);
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                              row.kind === "merit" ? TONE_PILL.green : TONE_PILL.rose,
                            )}
                          >
                            {row.kind === "merit" ? c.kindMerit : c.kindDemerit}
                          </span>
                          <span className="text-xs font-semibold text-foreground/45">
                            {formatDate(row.occurredOn, locale)}
                          </span>
                          <span className="text-xs font-medium text-foreground/55">
                            {c.categories[row.category]}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold tabular-nums",
                              signed > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
                            )}
                          >
                            {signed > 0 ? `+${signed}` : signed} {c.pointsUnit}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-foreground">
                          {student ? studentName(student) : c.unknownStudent}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                          {row.description}
                        </p>
                        {row.recordedByName ? (
                          <p className="mt-2 text-[11px] font-medium text-foreground/40">
                            {c.recordedBy(row.recordedByName)}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        aria-label={c.deleteEntry}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-foreground/45 transition-colors hover:bg-error/10 hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {addOpen ? (
                <AddConductDialog
                  key="add-conduct"
                  students={students}
                  onCreate={handleCreate}
                  onClose={() => setAddOpen(false)}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={c.deleteConfirm}
        description={deleteTarget?.description}
        confirmLabel={t.gradebook.delete}
        cancelLabel={t.gradebook.cancel}
        pending={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />

      <EducationalSupportReviewDialog
        open={reviewStudent !== null}
        studentId={reviewStudent?.id ?? ""}
        classId={classId}
        studentName={reviewStudent?.name ?? ""}
        supports={reviewStudent?.supports ?? []}
        onClose={() => setReviewStudent(null)}
        onAcknowledged={() => {
          if (reviewStudent) markSupportReviewed(reviewStudent.id);
        }}
      />
    </div>
  );
}

function AddConductDialog({
  students,
  onCreate,
  onClose,
}: {
  students: TeacherStudent[];
  onCreate: (payload: {
    studentId: string;
    occurredOn: string;
    kind: ConductKind;
    category: ConductCategory;
    description: string;
    points: number;
  }) => Promise<boolean>;
  onClose: () => void;
}) {
  const t = useT();
  const c = t.conduct;
  const today = new Date().toISOString().slice(0, 10);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [occurredOn, setOccurredOn] = useState(today);
  const [kind, setKind] = useState<ConductKind>("merit");
  const [category, setCategory] = useState<ConductCategory>(
    defaultCategoryForKind("merit"),
  );
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("1");
  const [pending, setPending] = useState(false);

  const categoryOptions = categoriesForKind(kind);

  function selectKind(next: ConductKind) {
    setKind(next);
    if (!isCategoryValidForKind(next, category)) {
      setCategory(defaultCategoryForKind(next));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) return;
    setPending(true);
    const parsedPoints = Number(points);
    const ok = await onCreate({
      studentId,
      occurredOn,
      kind,
      category,
      description: description.trim(),
      points: Number.isFinite(parsedPoints) ? parsedPoints : 1,
    });
    setPending(false);
    if (ok) onClose();
  }

  function adjustPoints(delta: number) {
    const next = Math.min(5, Math.max(1, Number(points) + delta));
    setPoints(String(next));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <motion.button
        type="button"
        aria-label={t.common.close}
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
        aria-label={c.addEntry}
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-visible rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-foreground">{c.addEntry}</h4>
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
            <span className="text-xs font-semibold text-foreground/70">{c.student}</span>
            <Dropdown
              value={studentId}
              onChange={setStudentId}
              ariaLabel={c.student}
              size="form"
              options={students.map((student) => ({
                value: student.id,
                label: studentName(student),
              }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/70">{c.date}</span>
            <DatePicker
              value={occurredOn}
              onChange={(value) => {
                if (value) setOccurredOn(value);
              }}
              fullWidth
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/70">{c.kindLabel}</span>
            <div className="flex gap-2">
              {(["merit", "demerit"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectKind(option)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    kind === option
                      ? option === "merit"
                        ? cn("border-transparent", TONE_PILL.green)
                        : cn("border-transparent", TONE_PILL.rose)
                      : "border-border text-foreground/60 ui-hover",
                  )}
                >
                  {option === "merit" ? c.kindMerit : c.kindDemerit}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/70">{c.categoryLabel}</span>
            <Dropdown
              value={category}
              onChange={(value) => setCategory(value as ConductCategory)}
              ariaLabel={c.categoryLabel}
              size="form"
              options={categoryOptions.map((key) => ({
                value: key,
                label: c.categories[key],
              }))}
            />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/70">{c.descriptionLabel}</span>
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={c.descriptionPlaceholder}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-400"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/70">{c.pointsLabel}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustPoints(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border ui-hover"
                aria-label={c.decreasePoints}
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                inputMode="numeric"
                className="h-10 w-16 rounded-xl border border-border bg-background text-center text-sm font-bold text-foreground outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={() => adjustPoints(1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border ui-hover"
                aria-label={c.increasePoints}
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-foreground/50">{c.pointsHint}</span>
            </div>
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 ui-hover"
            >
              {t.gradebook.cancel}
            </button>
            <button
              type="submit"
              disabled={pending || description.trim().length < 3}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {c.saveEntry}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
