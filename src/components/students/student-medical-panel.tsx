import { HeartPulse } from "lucide-react";
import type { StudentMedicalInfo } from "@/lib/dashboard/student-medical";

/**
 * Read-only ficha médica on the teacher's student page.
 *
 * Deliberately styled as a warning-tinted panel: this is sensitive health
 * information (allergies, conditions, medication with dose and frequency) that
 * exists so a teacher knows what to do in an emergency. Teachers cannot edit it;
 * changes happen in the school ERP by an administrator.
 */
export function StudentMedicalPanel({ info }: { info: StudentMedicalInfo }) {
  const medications = info.medications;

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20">
      <header className="flex items-center gap-2 border-b border-rose-200/70 px-5 py-4 dark:border-rose-900/40">
        <HeartPulse className="h-4 w-4 text-rose-600 dark:text-rose-300" />
        <h2 className="text-sm font-bold text-foreground">Ficha médica</h2>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
          Solo lectura
        </span>
      </header>

      <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-foreground/55">
            Alergias
          </dt>
          <dd className="mt-1 whitespace-pre-line text-sm font-medium text-foreground">
            {info.allergies || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-foreground/55">
            Enfermedades / condiciones
          </dt>
          <dd className="mt-1 whitespace-pre-line text-sm font-medium text-foreground">
            {info.conditions || "—"}
          </dd>
        </div>

        {info.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-foreground/55">
              Notas
            </dt>
            <dd className="mt-1 whitespace-pre-line text-sm font-medium text-foreground">
              {info.notes}
            </dd>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <dt className="text-[11px] font-bold uppercase tracking-wide text-foreground/55">
            Medicamentos
          </dt>
          <dd className="mt-1.5">
            {medications.length === 0 ? (
              <span className="text-sm text-foreground/60">Sin medicamentos registrados.</span>
            ) : (
              <ul className="flex flex-col gap-2">
                {medications.map((med) => (
                  <li
                    key={med.id}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-white/60 px-3 py-2 text-sm dark:bg-black/20"
                  >
                    <span className="font-semibold text-foreground">{med.name}</span>
                    <span className="text-foreground/80">{med.dose}</span>
                    <span className="text-foreground/80">· {med.frequency}</span>
                    {med.notes ? (
                      <span className="text-foreground/65">— {med.notes}</span>
                    ) : null}
                    {med.active ? null : (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/60">
                        Inactivo
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <p className="border-t border-rose-200/70 px-5 py-2.5 text-[11px] font-medium text-foreground/55 dark:border-rose-900/40">
        Información confidencial. Los cambios los realiza administración en el ERP del colegio.
      </p>
    </section>
  );
}
