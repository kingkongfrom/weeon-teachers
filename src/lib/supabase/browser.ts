"use client";

import type { AuthChangeEvent, RealtimeChannel, Session } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

import { authCookieOptions } from "@/lib/supabase/auth-cookie";

export type RealtimeConfig = {
  url: string;
  anonKey: string;
  accessToken?: string | null;
};

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
  let token = config.accessToken ?? null;
  if (!token) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token ?? null;
  }
  await supabase.realtime.setAuth(token);
  return supabase;
}

/** Remove a prior subscription on `topic` so new `.on()` bindings can run before `subscribe()`. */
export async function detachRealtimeTopic(
  supabase: ReturnType<typeof getRealtimeClient>,
  topic: string,
): Promise<void> {
  const fullTopic = `realtime:${topic}`;
  const existing = supabase.getChannels().find((channel: RealtimeChannel) => channel.topic === fullTopic);
  if (existing) {
    await supabase.removeChannel(existing);
  }
}

const realtimeTopicTail = new Map<string, Promise<unknown>>();

/** Serialize connect/cleanup for one Realtime topic (Strict Mode + async auth races). */
export async function withRealtimeTopicLock<T>(
  topic: string,
  fn: () => Promise<T>,
): Promise<T> {
  const wait = realtimeTopicTail.get(topic) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = wait.catch(() => undefined).then(() => gate);
  realtimeTopicTail.set(topic, chained);
  await wait.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (realtimeTopicTail.get(topic) === chained) {
      realtimeTopicTail.delete(topic);
    }
  }
}

/** Keep Realtime JWT aligned with cookie session refreshes during a subscription. */
export function bindRealtimeAuthRefresh(
  supabase: ReturnType<typeof getRealtimeClient>,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    void supabase.realtime.setAuth(session?.access_token ?? null);
  });
  return () => subscription.unsubscribe();
}
