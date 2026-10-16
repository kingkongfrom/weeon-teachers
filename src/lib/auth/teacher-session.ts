import "server-only";

import { cache } from "react";
import { isTeacherPortalRole } from "@/lib/auth/portal-role";
import { createSessionClient } from "@/lib/supabase/session";

export type TeacherSession = {
  userId: string;
  tenantId: string;
  username: string | null;
  name: string;
  role: "teacher";
  accountStatus: string;
  avatarStoragePath: string | null;
};

export const getTeacherSession = cache(
  async (): Promise<TeacherSession | null> => {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tenant_id, role, username, name, account_status, avatar_storage_path")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return null;

  const claimRole = user.app_metadata?.role;
  const teacher = isTeacherPortalRole(profile.role) && claimRole !== "admin";
  if (!teacher || !profile.tenant_id) {
    await supabase.auth.signOut({ scope: "local" });
    return null;
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id as string,
    username: (profile.username as string | null) ?? null,
    name: (profile.name as string) || "Docente",
    role: "teacher",
    accountStatus: (profile.account_status as string) || "active",
    avatarStoragePath:
      typeof profile.avatar_storage_path === "string" && profile.avatar_storage_path.length > 0
        ? profile.avatar_storage_path
        : null,
  };
  },
);
