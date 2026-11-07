import { PageHeader } from "@/components/layout/page-header";
import { BlooketBuilder } from "@/components/blooket/blooket-builder";
import { loadTenantGradeLevels } from "@/lib/dashboard/grade-levels";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Crear set de Blooket",
};

/**
 * Blooket builder — writes a set in Blooket's spreadsheet format and downloads
 * it as CSV. Blooket has no public API, so the teacher uploads the file there
 * through Create → CSV Import; nothing is sent to Blooket from Weeon.
 *
 * `gradeLevels` is the INSTITUTION's niveles, so
 * Nivel offers a closed list instead of free text — a typo there made the set
 * unfilterable in the library.
 */
export default async function BlooketPage() {
  const gradeLevels = await loadTenantGradeLevels();

  return (
    <div className="flex flex-col gap-6 pb-6 md:pb-0">
      <PageHeader
        title="Crear set de Blooket"
        /*
         * The format limits live HERE, not in a trailing paragraph at the bottom
         * of the page: they are read once, before writing, and the bottom copy
         * collided with the phone's bottom bar. Nothing enforces the 4-answer
         * limit in the editor, so this is the only place a teacher learns it.
         */
        description="Hasta 4 respuestas por pregunta, en opción múltiple, verdadero/falso o respuesta escrita. Descargue el CSV y súbalo en Blooket con Create → CSV Import."
        backHref="/aula-virtual"
        backLabel="Aula virtual"
      />
      {/*
       * `pb-6 md:pb-0` on the PAGE, not on the trailing paragraph: the shell
       * reserves the phone bar's height, but the last element still landed
       * flush against it. A page-level pad leaves visible breathing room and
       * does not depend on which element happens to be last.
       */}
      <BlooketBuilder gradeLevels={gradeLevels} />
    </div>
  );
}
