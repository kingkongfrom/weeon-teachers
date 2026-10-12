"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  bindRealtimeAuthRefresh,
  getAuthedRealtimeClient,
  type RealtimeConfig,
} from "@/lib/supabase/browser";

const MAIL_LIST_REFRESH_MS = 400;

/** Debounced server refresh when Correo / Circulares rows change. */
export function useMailRealtimeRefresh(
  realtime: RealtimeConfig | null,
  enabled = true,
  onListBump?: () => void,
): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !realtime?.url || !realtime.anonKey) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;

    const bump = () => {
      onListBump?.();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), MAIL_LIST_REFRESH_MS);
    };

    void (async () => {
      const supabase = await getAuthedRealtimeClient(realtime);
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel("mail-inbox")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          bump,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "threads" },
          bump,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "threads" },
          bump,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "thread_recipients" },
          bump,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "thread_recipients" },
          bump,
        )
        .subscribe();
      cleanupChannel = () => {
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unbindAuth?.();
      cleanupChannel?.();
    };
  }, [enabled, onListBump, realtime?.url, realtime?.anonKey, router]);
}

/** Refetch open thread body when new rows land on that thread (no full navigation). */
export function useThreadDetailRealtime(
  realtime: RealtimeConfig | null,
  threadId: string | null,
  onThreadChange: () => void,
): void {
  useEffect(() => {
    if (!threadId || !realtime?.url || !realtime.anonKey) return;

    let active = true;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;

    void (async () => {
      const supabase = await getAuthedRealtimeClient(realtime);
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel(`mail-thread:${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          () => onThreadChange(),
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "threads",
            filter: `id=eq.${threadId}`,
          },
          () => onThreadChange(),
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "thread_recipients",
            filter: `thread_id=eq.${threadId}`,
          },
          () => onThreadChange(),
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
  }, [onThreadChange, realtime?.anonKey, realtime?.url, threadId]);
}
