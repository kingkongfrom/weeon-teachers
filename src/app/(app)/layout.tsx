import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadPanelAttention } from "@/lib/dashboard/panel-attention";
import { loadSchoolLogoUrl, loadSchoolName } from "@/lib/dashboard/school";
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

  const [tenantName, logoUrl, attention] = await Promise.all([
    loadSchoolName(session.tenantId),
    loadSchoolLogoUrl(session.tenantId),
    loadPanelAttention(),
  ]);
  const supabasePublic = requireSupabasePublicEnv();

  return (
    <AppShell
      supabasePublic={supabasePublic}
      commsNavAttention={{
        unreadInboxCount: attention.unreadInboxCount,
        unreadChatCount: attention.unreadChatCount,
      }}
      user={{
        userId: session.userId,
        tenantId: session.tenantId,
        name: session.name,
        role: session.role,
        username: session.username,
        tenantName,
        logoUrl,
        avatarStoragePath: session.avatarStoragePath,
      }}
    >
      {children}
    </AppShell>
  );
}
