import { PageHeader } from "@/components/layout/page-header";
import { BlooketBuilder } from "@/components/blooket/blooket-builder";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Crear set de Blooket",
};

/**
 * Blooket builder — writes a set in Blooket's spreadsheet format and downloads
 * it as CSV. Blooket has no public API, so the teacher uploads the file there
 * through Create → CSV Import; nothing is sent to Blooket from Weeon.
 */
export default function BlooketPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Crear set de Blooket"
        description="Escribe las preguntas, descarga el CSV y súbelo en Blooket con Create → CSV Import."
        backHref="/aula-virtual"
        backLabel="Aula virtual"
      />
      <BlooketBuilder />
    </div>
  );
}
