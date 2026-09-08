import { FileText } from "lucide-react";

export default async function ReportesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">Reportes</h1>
        <p className="text-sm font-medium text-foreground/55">
          Reportes y calificaciones de sus grupos.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
          <FileText className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <p className="text-sm font-medium text-foreground/60">
          Los reportes están en preparación. Pronto podrá generarlos aquí.
        </p>
      </div>
    </div>
  );
}
