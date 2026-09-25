"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  bindRealtimeAuthRefresh,
  getAuthedRealtimeClient,
  type RealtimeConfig,
} from "@/lib/supabase/browser";

/** Debounced server refresh when Correo / Circulares rows change. */
export function useMailRealtimeRefresh(realtime: RealtimeConfig | null, enabled = true): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !realtime?.url || !realtime.anonKey) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;

    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 700);
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
  }, [enabled, realtime?.url, realtime?.anonKey, router]);
}
