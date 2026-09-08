import "server-only";

import { createSessionClient } from "@/lib/supabase/session";

export type TeacherSession = {
  userId: string;
  tenantId: string;
  username: string | null;
  name: string;
  role: "teacher" | "admin";
  accountStatus: string;
};

export async function getTeacherSession(): Promise<TeacherSession | null> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role, username, name, account_status")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role === "admin" || profile?.role === "teacher" ? profile.role : null;
  if (!profile || !role || !profile.tenant_id) {
    return null;
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id as string,
    username: (profile.username as string | null) ?? null,
    name: (profile.name as string) || (role === "admin" ? "Administración" : "Docente"),
    role,
    accountStatus: (profile.account_status as string) || "active",
  };
}
