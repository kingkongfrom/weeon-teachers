import { PageHeader } from "@/components/layout/page-header";
import { LibraryBrowser } from "@/components/library/library-browser";
import { loadAssessmentLibrary } from "@/lib/dashboard/library";
import { loadSubjectOptions } from "@/lib/dashboard/library-options";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Mis evaluaciones — the teacher's reusable assessment library.
 *
 * Server component loads the library once; the browser component owns the tabs,
 * filters and dialogs, and calls `router.refresh()` through a small client
 * wrapper after every write.
 */
export default async function MisEvaluacionesPage() {
  const t = await getT();
  const [{ collections, items }, subjects] = await Promise.all([
    loadAssessmentLibrary(),
    loadSubjectOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.library.title}
        description={t.library.description}
        backHref="/aula-virtual"
        backLabel={t.aulaVirtual.back}
      />
      <LibraryBrowser collections={collections} items={items} subjects={subjects} />
    </div>
  );
}
