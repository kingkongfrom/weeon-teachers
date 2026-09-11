import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { loadMyReports, type SubmittedReport } from "@/lib/dashboard/reports";
import { schoolPeriodLabel } from "@/lib/dashboard/school-period";

export default async function ReportesPage() {
  const reports = await loadMyReports();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        description={
          reports.length === 0
            ? "Los reportes que suba aparecerán aquí."
            : "Reportes de calificaciones subidos."
        }
        backHref="/inicio"
      />

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
            <FileText className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium text-foreground/60">
            Aún no ha subido reportes. Desde un grupo, use «Subir reporte» para
            publicar las calificaciones aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {reports.map((report) => (
            <ReportCard key={`${report.classId}-${report.submittedAt}`} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: SubmittedReport }) {
  const assignmentIds = Object.keys(report.grades);
  const studentIds = collectStudentIds(report);

  return (
    <section className="w-fit max-w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-background px-5 py-3">
        <Link
          href={`/grupos/${report.classId}`}
          className="text-sm font-semibold text-foreground transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-300"
        >
          {report.groupName}
        </Link>
        {report.subjectName ? (
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
            {report.subjectName}
          </span>
        ) : null}
        <span className="text-xs font-medium text-foreground/50">
          {report.period || schoolPeriodLabel(report.submittedAt)}
        </span>
        {wasResubmitted(report) ? (
          <span
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            title={new Date(report.updatedAt).toLocaleString("es-CR")}
          >
            Actualizado
          </span>
        ) : null}
      </div>

      {assignmentIds.length === 0 || studentIds.length === 0 ? (
        <p className="px-5 py-6 text-sm font-medium text-foreground/50">
          Este reporte no tiene calificaciones.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-fit border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
                <th className="px-4 py-2.5 font-medium">Estudiante</th>
                {assignmentIds.map((assignmentId) => (
                  <th key={assignmentId} className="px-4 py-2.5 text-right font-medium">
                    {report.assignmentTitles[assignmentId] ?? "Examen"}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium">Promedio</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {studentIds.map((studentId, index) => (
                <tr key={studentId} className={index % 2 === 1 ? "bg-surface-muted/30" : undefined}>
                  <td className="px-4 py-2 font-medium text-foreground">
                    {report.studentNames[studentId] ?? studentId.slice(0, 6)}
                  </td>
                  {assignmentIds.map((assignmentId) => {
                    const grade = report.grades[assignmentId][studentId];
                    return (
                      <td key={assignmentId} className="px-4 py-2 text-right tabular-nums text-foreground">
                        {grade ? `${grade.mark}${grade.maxMarks ? `/${grade.maxMarks}` : ""}` : "—"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right tabular-nums">
                    <AveragePct report={report} studentId={studentId} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge report={report} studentId={studentId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** True when the report was edited after its first submission. */
function wasResubmitted(report: SubmittedReport): boolean {
  const updated = new Date(report.updatedAt).getTime();
  const submitted = new Date(report.submittedAt).getTime();
  if (Number.isNaN(updated) || Number.isNaN(submitted)) return false;
  return updated - submitted > 1000;
}

/** Student's mean percentage across their graded exams in this report. */
function AveragePct({ report, studentId }: { report: SubmittedReport; studentId: string }) {
  const pct = computeAverage(report, studentId);
  if (pct === null) return <span className="text-foreground/40">—</span>;
  return <span className="font-semibold text-foreground">{Math.round(pct)}%</span>;
}

/** Aprobado (>=70% as displayed) / Reprobado (<70%). Uses the same rounded
 * value shown in the Promedio column so a displayed "70%" is Aprobado. */
function StatusBadge({ report, studentId }: { report: SubmittedReport; studentId: string }) {
  const pct = computeAverage(report, studentId);
  if (pct === null) {
    return <span className="text-xs font-medium text-foreground/40">—</span>;
  }
  const passed = Math.round(pct) >= 70;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        passed
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
      }`}
    >
      {passed ? "Aprobado" : "Reprobado"}
    </span>
  );
}

/** Mean percentage (0..100) or null when the student has no graded exams. */
function computeAverage(report: SubmittedReport, studentId: string): number | null {
  let sum = 0;
  let count = 0;
  for (const assignment of Object.values(report.grades)) {
    const grade = assignment[studentId];
    if (!grade) continue;
    const max = grade.maxMarks || 100;
    if (max <= 0) continue;
    sum += (grade.mark / max) * 100;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

/** Union of all student ids that appear across assignments, in stable order. */
function collectStudentIds(report: SubmittedReport): string[] {
  const seen = new Set<string>();
  for (const assignment of Object.values(report.grades)) {
    for (const studentId of Object.keys(assignment)) seen.add(studentId);
  }
  return [...seen];
}
