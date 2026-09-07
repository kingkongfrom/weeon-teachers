import { FadeIn } from "@/components/motion/fade-in";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <>
      <Header
        title="Reports"
        description="All student reports in one place."
        showNewReport
      />

      <div className="flex-1 p-8">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>No reports yet</CardTitle>
              <CardDescription>
                Create your first student report to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
