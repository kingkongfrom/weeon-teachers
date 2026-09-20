"use client";

import { createBrowserClient } from "@supabase/ssr";

import { authCookieOptions } from "@/lib/supabase/auth-cookie";

export type RealtimeConfig = { url: string; anonKey: string };

let client: ReturnType<typeof createBrowserClient> | null = null;
let clientKey = "";

/** One browser Supabase client (cookie session) reused across mounts. The anon
 * key is public — the server passes it down because this app keeps Supabase
 * env vars server-only. RLS still gates every row.
 *
 * `cookieOptions` must match {@link createSessionClient}: the session is stored
 * under a custom cookie name, so without it this client cannot read the session
 * and Realtime subscribes unauthenticated (incoming rows are then dropped by
 * RLS — e.g. guardian replies never reaching the teacher). */
export function getRealtimeClient(config: RealtimeConfig) {
  const key = `${config.url}|${config.anonKey}`;
  if (!client || clientKey !== key) {
    client = createBrowserClient(config.url, config.anonKey, {
      cookieOptions: authCookieOptions(),
    });
    clientKey = key;
  }
  return client;
}

/**
 * Realtime-authenticated client: resolves the cookie session and applies it to
 * the Realtime socket *before* any channel subscribes.
 *
 * `realtime-js` only attaches the access token to channels whose subscription
 * starts after the token value is set (or when the token later *changes*). A
 * channel created before the async cookie session resolves would join
 * unauthenticated and never receive an `access_token` update, so RLS silently
 * drops every incoming row. Awaiting this guarantees the socket is authorised
 * first.
 */
export async function getAuthedRealtimeClient(config: RealtimeConfig) {
  const supabase = getRealtimeClient(config);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await supabase.realtime.setAuth(session?.access_token ?? null);
  return supabase;
}

/** Keep Realtime JWT aligned with cookie session refreshes during a subscription. */
export function bindRealtimeAuthRefresh(
  supabase: ReturnType<typeof getRealtimeClient>,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    void supabase.realtime.setAuth(session?.access_token ?? null);
  });
  return () => subscription.unsubscribe();
}
