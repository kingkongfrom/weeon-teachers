import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { TEACHER_PORTAL_ONLY_ERROR } from "@/lib/auth/portal-role";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const session = await getTeacherSession();
  if (session?.accountStatus === "pending_first_login") {
    redirect("/crear-contrasena");
  }
  if (session) {
    redirect("/inicio");
  }

  const { aviso } = await searchParams;
  return <LoginForm initialError={aviso === "admin" ? TEACHER_PORTAL_ONLY_ERROR : null} />;
}
