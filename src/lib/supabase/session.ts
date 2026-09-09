import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase/auth-cookie";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

/** Cookie-backed Supabase client for server actions and RSC. */
export async function createSessionClient() {
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
}
