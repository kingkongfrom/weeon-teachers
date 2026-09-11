import { redirect } from "next/navigation";
import { CreatePasswordForm } from "@/components/auth/create-password-form";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export default async function CreatePasswordPage() {
  const session = await getTeacherSession();
  if (!session) {
    redirect("/");
  }
  if (session.accountStatus !== "pending_first_login") {
    redirect("/inicio");
  }

  return <CreatePasswordForm />;
}
