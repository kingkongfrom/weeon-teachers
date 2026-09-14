import "server-only";

import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase/auth-cookie";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Cookie-backed Supabase client for server actions and RSC.
 *
 * Wrapped in `cache` so one client instance is shared across every loader in a
 * single render — the client is stateless per request, so this is safe and
 * avoids rebuilding it (and re-reading cookies) dozens of times per page.
 */
export const createSessionClient = cache(async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — proxy handles refresh.
        }
      },
    },
  });
});
