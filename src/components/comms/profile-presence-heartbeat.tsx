"use client";

import { useEffect } from "react";
import { getAuthedRealtimeClient, type RealtimeConfig } from "@/lib/supabase/browser";

const HEARTBEAT_MS = 90_000;

export function ProfilePresenceHeartbeat({
  realtime,
  enabled = true,
}: {
  realtime: RealtimeConfig;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled || !realtime.url || !realtime.anonKey) return;

    let cancelled = false;

    async function pulse() {
      if (cancelled || document.visibilityState === "hidden") return;
      const supabase = await getAuthedRealtimeClient(realtime);
      await supabase.rpc("touch_profile_presence");
    }

    void pulse();
    const timer = window.setInterval(() => void pulse(), HEARTBEAT_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void pulse();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, realtime]);

  return null;
}
