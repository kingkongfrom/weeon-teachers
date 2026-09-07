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

export default function StudentsPage() {
  return (
    <>
      <Header
        title="Students"
        description="Manage the students in your classroom."
      />

      <div className="flex-1 p-8">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>No students yet</CardTitle>
              <CardDescription>
                Add students to link them with their reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled>
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
