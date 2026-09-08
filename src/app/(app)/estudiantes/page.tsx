import { Users } from "lucide-react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadStudentList } from "@/lib/dashboard/students";
import { StudentsTable } from "@/components/students/students-table";

export default async function EstudiantesPage() {
  const session = await getTeacherSession();
  const { students, total } = await loadStudentList({ limit: PAGE_SIZE, offset: 0 });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">Estudiantes</h1>
        <p className="text-sm font-medium text-foreground/55">
          {session?.role === "admin"
            ? "Estudiantes de la institución."
            : "Solo se muestran los estudiantes que puede ver."}
        </p>
      </header>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300">
            <Users className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium text-foreground/60">
            Se mostrarán aquí los estudiantes de sus grupos.
          </p>
        </div>
      ) : (
        <StudentsTable students={students} total={total} />
      )}
    </div>
  );
}

const PAGE_SIZE = 20;
