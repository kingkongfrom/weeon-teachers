import { ReportesPageView } from "@/components/reports/reportes-page-view";
import { loadMyReports } from "@/lib/dashboard/reports";

export default async function ReportesPage() {
  const reports = await loadMyReports();
  return <ReportesPageView reports={reports} />;
}