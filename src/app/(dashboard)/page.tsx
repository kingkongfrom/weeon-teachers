import { FadeIn } from "@/components/motion/fade-in";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Users } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        description="Create and manage student reports for your classroom."
        showNewReport
      />

      <div className="flex-1 p-8">
        <FadeIn className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/reports">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>Reports</CardTitle>
                    <CardDescription>View and edit student reports</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500">
                  Draft, publish, and organize progress reports for your students.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/students">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>Students</CardTitle>
                    <CardDescription>Manage your student roster</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500">
                  Keep track of students and link them to their reports.
                </p>
              </CardContent>
            </Card>
          </Link>
        </FadeIn>
      </div>
    </>
  );
}
