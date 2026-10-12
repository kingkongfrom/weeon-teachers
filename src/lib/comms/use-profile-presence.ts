"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  presenceStatusFromLastSeen,
  type PresenceStatus,
} from "@/lib/comms/presence-status";
import { isPresenceLookupKey, resolvePresenceProfileIds } from "@/lib/comms/presence-key-resolve";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { bindRealtimeAuthRefresh, getAuthedRealtimeClient } from "@/lib/supabase/browser";
import type { RealtimeConfig } from "@/lib/supabase/browser";

type PresenceRow = { profile_id: string; last_seen_at: string };

const PRESENCE_KEY_SEP = "\u0001";

function serializePresenceKeys(lookupKeys: string[]): string {
  return [...new Set(lookupKeys.map((id) => id.trim()).filter(isPresenceLookupKey))]
    .sort()
    .join(PRESENCE_KEY_SEP);
}

function clearPresenceMaps(
  setRows: (updater: Map<string, string> | ((current: Map<string, string>) => Map<string, string>)) => void,
  setKeyToProfile: (
    updater: Map<string, string> | ((current: Map<string, string>) => Map<string, string>),
  ) => void,
) {
  setRows((current) => (current.size === 0 ? current : new Map()));
  setKeyToProfile((current) => (current.size === 0 ? current : new Map()));
}

export function useProfilePresence(
  lookupKeys: string[],
  realtime: RealtimeConfig | null | undefined,
): Map<string, PresenceStatus> {
  const keysKey = serializePresenceKeys(lookupKeys);
  const [rows, setRows] = useState<Map<string, string>>(() => new Map());
  const [keyToProfile, setKeyToProfile] = useState<Map<string, string>>(() => new Map());
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!keysKey || !realtime?.url || !realtime.anonKey) {
      clearPresenceMaps(setRows, setKeyToProfile);
      return;
    }
    const keys = keysKey.split(PRESENCE_KEY_SEP);
    const supabase = await getAuthedRealtimeClient(realtime);
    const resolved = await resolvePresenceProfileIds(supabase, keys);
    setKeyToProfile(resolved);

    const { data, error } = await supabase.rpc("profile_presence_for_keys", {
      p_keys: keys,
    });
    if (error) {
      const profileIds = [...new Set(resolved.values())];
      if (profileIds.length === 0) {
        setRows(new Map());
        return;
      }
      const fallback = await supabase
        .from("profile_presence")
        .select("profile_id, last_seen_at")
        .in("profile_id", profileIds);
      if (fallback.error) {
        setRows(new Map());
        return;
      }
      const next = new Map<string, string>();
      for (const row of (fallback.data ?? []) as PresenceRow[]) {
        next.set(row.profile_id, row.last_seen_at);
      }
      setRows(next);
      return;
    }

    type PresenceByKeyRow = { lookup_key: string; last_seen_at: string | null };
    const byKey = new Map<string, string>();
    const byProfile = new Map<string, string>();
    for (const row of (data ?? []) as PresenceByKeyRow[]) {
      if (!row.lookup_key || !row.last_seen_at) continue;
      byKey.set(row.lookup_key, row.last_seen_at);
      const profileId = resolved.get(row.lookup_key) ?? row.lookup_key;
      byProfile.set(profileId, row.last_seen_at);
    }
    setRows(byProfile.size > 0 ? byProfile : byKey);
  }, [keysKey, realtime]);

  useEffect(() => {
    void load();
  }, [load, keysKey]);

  useEffect(() => {
    if (!realtime?.url || !realtime.anonKey || !keysKey) return;

    let active = true;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;

    void (async () => {
      const supabase = await getAuthedRealtimeClient(realtime);
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel(`profile-presence-watch:${keysKey.slice(0, 40)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profile_presence" },
          (payload: RealtimePostgresChangesPayload<PresenceRow>) => {
            if (payload.new && "profile_id" in payload.new && "last_seen_at" in payload.new) {
              const fresh = payload.new as PresenceRow;
              setRows((current) => {
                const next = new Map(current);
                next.set(fresh.profile_id, fresh.last_seen_at);
                return next;
              });
            }
          },
        )
        .subscribe();
      cleanupChannel = () => {
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      active = false;
      unbindAuth?.();
      cleanupChannel?.();
    };
  }, [keysKey, realtime]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      void load();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return useMemo(() => {
    void tick;
    const map = new Map<string, PresenceStatus>();
    if (!keysKey) return map;
    for (const key of keysKey.split(PRESENCE_KEY_SEP)) {
      const profileId = keyToProfile.get(key) ?? key;
      map.set(key, presenceStatusFromLastSeen(rows.get(profileId)));
    }
    return map;
  }, [keysKey, keyToProfile, rows, tick]);
}
