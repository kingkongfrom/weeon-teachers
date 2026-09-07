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
import Link from "next/link";

export default function NewReportPage() {
  return (
    <>
      <Header
        title="New Report"
        description="Create a progress report for a student."
      />

      <div className="flex-1 p-8">
        <FadeIn>
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Report form</CardTitle>
              <CardDescription>
                Form fields for student selection, title, and report content will
                go here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button disabled>Save draft</Button>
              <Link href="/reports">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
