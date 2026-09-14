"use client";

import { createBrowserClient } from "@supabase/ssr";

export type RealtimeConfig = { url: string; anonKey: string };

let client: ReturnType<typeof createBrowserClient> | null = null;
let clientKey = "";

/** One browser Supabase client (cookie session) reused across mounts. The anon
 * key is public — the server passes it down because this app keeps Supabase
 * env vars server-only. RLS still gates every row. */
export function getRealtimeClient(config: RealtimeConfig) {
  const key = `${config.url}|${config.anonKey}`;
  if (!client || clientKey !== key) {
    client = createBrowserClient(config.url, config.anonKey);
    clientKey = key;
  }
  return client;
}
