import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export default async function LoginPage() {
  const session = await getTeacherSession();
  if (session?.accountStatus === "pending_first_login") {
    redirect("/crear-contrasena");
  }
  if (session) {
    redirect("/grupos");
  }

  return <LoginForm />;
}
