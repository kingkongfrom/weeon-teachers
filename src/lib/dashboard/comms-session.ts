import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type CommsActor = {
  userId: string;
  tenantId: string;
  actor: SupabaseClient;
};

/** Teacher session + Supabase client for Comunicación loaders and actions. */
export const getCommsActor = cache(async (): Promise<CommsActor | null> => {
  const session = await getTeacherSession();
  if (!session) return null;
  const actor = await createSessionClient();
  return { userId: session.userId, tenantId: session.tenantId, actor };
});
