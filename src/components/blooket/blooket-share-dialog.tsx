"use client";

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import {
  Dialog,
  DialogPrimary,
  DialogSecondary,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  listBlooketShareTargets,
  revokeBlooketShare,
  shareBlooketSet,
} from "@/lib/teachers/blooket-actions";
import type { SavedBlooketSet } from "@/lib/teachers/blooket-actions";

/**
 * Shares one saved Blooket set with colleagues.
 *
 * Same rule as Mis evaluaciones: a recipient can open and duplicate the set but
 * not edit it, and the owner can revoke at any time.
 */
export function BlooketShareDialog({
  open,
  set,
  onClose,
}: {
  open: boolean;
  set: SavedBlooketSet | null;
  onClose: () => void;
}) {
  const [teachers, setTeachers] = useState<
    Array<{ id: string; name: string; email: string | null; shared: boolean }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !set) return;
    setLoading(true);
    setError(null);
    void listBlooketShareTargets({ setId: set.id }).then((res) => {
      setLoading(false);
      if (!res.ok) {
        setError("No se pudo cargar la lista de docentes.");
        return;
      }
      setTeachers(res.teachers);
    });
  }, [open, set]);

  async function toggle(teacherId: string, shared: boolean) {
    if (!set) return;
    setBusyId(teacherId);
    setError(null);
    const res = shared
      ? await shareBlooketSet({ setId: set.id, teacherId })
      : await revokeBlooketShare({ setId: set.id, teacherId });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTeachers((current) =>
      current.map((teacher) =>
        teacher.id === teacherId ? { ...teacher, shared: !shared } : teacher,
      ),
    );
  }

  return (
    <Dialog
      open={open}
      title="Compartir set de Blooket"
      description={
        set
          ? `«${set.title}» · los docentes podrán abrirlo y duplicarlo, no editarlo.`
          : undefined
      }
      icon={<Users className="h-4 w-4" />}
      onClose={onClose}
      footer={
        <>
          <DialogSecondary onClick={onClose}>Cerrar</DialogSecondary>
          <DialogPrimary onClick={onClose}>Listo</DialogPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-foreground/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando docentes…
          </p>
        ) : teachers.length === 0 ? (
          <p className="text-sm text-foreground/55">
            No hay otros docentes en el colegio.
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {teachers.map((teacher) => (
              <li key={teacher.id}>
                <button
                  type="button"
                  onClick={() => void toggle(teacher.id, teacher.shared)}
                  disabled={busyId === teacher.id}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    teacher.shared
                      ? "bg-[#0891B2]/10 font-semibold text-foreground"
                      : "text-foreground/75 hover:bg-surface-muted",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{teacher.name || teacher.email}</span>
                    {teacher.email ? (
                      <span className="block truncate text-[11.5px] text-foreground/45">
                        {teacher.email}
                      </span>
                    ) : null}
                  </span>
                  {busyId === teacher.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <span className="shrink-0 text-[11.5px] font-semibold text-[#0e7490] dark:text-[#22d3ee]">
                      {teacher.shared ? "Con acceso" : "Compartir"}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-[13px] font-medium text-error">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
