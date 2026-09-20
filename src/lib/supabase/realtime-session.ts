import "server-only";

import { createSessionClient } from "@/lib/supabase/session";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import type { RealtimeConfig } from "@/lib/supabase/browser";

export async function loadBrowserRealtimeConfig(): Promise<RealtimeConfig> {
  const { url, anonKey } = requireSupabasePublicEnv();
  const supabase = await createSessionClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    url,
    anonKey,
    accessToken: session?.access_token ?? null,
  };
}
