import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getTeacherSession();
  if (!session) {
    redirect("/");
  }
  if (session.accountStatus === "pending_first_login") {
    redirect("/crear-contrasena");
  }

  const tenantName = await loadSchoolName(session.tenantId);
  const supabasePublic = requireSupabasePublicEnv();

  return (
    <AppShell
      supabasePublic={supabasePublic}
      user={{
        userId: session.userId,
        tenantId: session.tenantId,
        name: session.name,
        role: session.role,
        username: session.username,
        tenantName,
        avatarStoragePath: session.avatarStoragePath,
      }}
    >
      {children}
    </AppShell>
  );
}
