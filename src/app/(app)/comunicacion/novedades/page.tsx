import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StreamPanel } from "@/components/classroom/stream-panel";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { loadClassStream } from "@/lib/dashboard/stream";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Novedades inside Comunicación: the class-level announcement stream. */
export default async function ComunicacionNovedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId: classIdParam } = await searchParams;
  const t = await getT();
  const m = t.messages;

  const grupos = await loadTeacherGrupos();
  const classId = grupos.some((grupo) => grupo.id === classIdParam)
    ? (classIdParam as string)
    : grupos[0]?.id;
  const posts = classId ? await loadClassStream(classId) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={m.news} description={m.newsHint} backHref="/comunicacion" />

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground/55">{t.aulaVirtual.emptyBody}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground/55">{m.pickClass}</span>
            {grupos.map((grupo) => (
              <Link
                key={grupo.id}
                href={`/comunicacion/novedades?classId=${grupo.id}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                  grupo.id === classId
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                    : "border-border text-foreground/65 hover:bg-surface-muted",
                )}
              >
                {grupo.name}
              </Link>
            ))}
          </div>

          {classId ? (
            <StreamPanel key={classId} classId={classId} posts={posts} />
          ) : null}
        </>
      )}
    </div>
  );
}
