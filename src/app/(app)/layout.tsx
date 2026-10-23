import "server-only";

import { cache, Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AppShellSkeletonChrome } from "@/components/layout/app-shell-skeleton";
import { getTeacherSession, type TeacherSession } from "@/lib/auth/teacher-session";
import {
  cachedAppShellChrome,
  loadAppShellChrome,
  type AppShellChrome,
} from "@/lib/dashboard/app-shell-chrome";
import { loadPanelAttention } from "@/lib/dashboard/panel-attention";
import { loadSchoolLogoUrl, loadSchoolName } from "@/lib/dashboard/school";
import { loadSignedInTeacherSubjects } from "@/lib/dashboard/teacher-assignments";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** One load per request: the shell chrome never depends on the locale. */
const loadChrome = cache(async (tenantId: string): Promise<AppShellChrome> =>
  loadAppShellChrome(tenantId, {
    tenantName: () => loadSchoolName(tenantId),
    logoUrl: () => loadSchoolLogoUrl(tenantId),
    attention: () => loadPanelAttention(),
    subjects: () => loadSignedInTeacherSubjects(),
  }),
);

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getTeacherSession();
  if (!session) {
    redirect("/");
  }
  if (session.accountStatus === "pending_first_login") {
    redirect("/crear-contrasena");
  }

  const supabasePublic = requireSupabasePublicEnv();

  return (
    <Suspense
      fallback={
        <AppShellSkeletonChrome
          chrome={cachedAppShellChrome(session.tenantId)}
          session={session}
          supabasePublic={supabasePublic}
        >
          {children}
        </AppShellSkeletonChrome>
      }
    >
      <ResolvedShell session={session} supabasePublic={supabasePublic}>
        {children}
      </ResolvedShell>
    </Suspense>
  );
}

async function ResolvedShell({
  session,
  supabasePublic,
  children,
}: {
  session: TeacherSession;
  supabasePublic: ReturnType<typeof requireSupabasePublicEnv>;
  children: ReactNode;
}) {
  const chrome = await loadChrome(session.tenantId);

  return (
    <AppShell
      supabasePublic={supabasePublic}
      commsNavAttention={{
        unreadInboxCount: chrome.attention.unreadInboxCount,
        unreadChatCount: chrome.attention.unreadChatCount,
      }}
      user={{
        userId: session.userId,
        tenantId: session.tenantId,
        name: session.name,
        role: session.role,
        username: session.username,
        tenantName: chrome.tenantName,
        logoUrl: chrome.logoUrl,
        avatarStoragePath: session.avatarStoragePath,
        subjects: chrome.subjects,
      }}
    >
      {children}
    </AppShell>
  );
}
