import { PageHeader } from "@/components/layout/page-header";
import { ExcursionBoard } from "@/components/excursions/excursion-board";
import { schoolToday } from "@/lib/attendance/model";
import { isPastExcursion, loadResponsibleExcursions } from "@/lib/dashboard/excursions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Cover preview of trips this docente is responsible for. The detail matches the school ERP. */
export default async function ExcursionesPage() {
  const t = await getT();
  const copy = t.agenda.excursiones;
  const loaded = await loadResponsibleExcursions();
  const today = schoolToday();
  const trips = loaded.ok ? loaded.trips : [];
  const upcoming = trips
    .filter((trip) => !isPastExcursion(trip, today))
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = trips
    .filter((trip) => isPastExcursion(trip, today))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.label} backHref="/agenda" />

      {!loaded.ok ? (
        <p className="text-sm font-semibold text-error">{copy.loadError}</p>
      ) : trips.length === 0 ? (
        <p className="text-sm font-medium text-foreground/60">{copy.empty}</p>
      ) : (
        <ExcursionBoard upcoming={upcoming} past={past} />
      )}
    </div>
  );
}
