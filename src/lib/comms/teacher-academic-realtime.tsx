"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  bindRealtimeAuthRefresh,
  getAuthedRealtimeClient,
  type RealtimeConfig,
} from "@/lib/supabase/browser";

/** Paths where submission or attendance inbox data is shown. */
function caresAboutAcademicInbox(pathname: string): boolean {
  return (
    pathname === "/inicio" ||
    pathname.startsWith("/aula-virtual") ||
    pathname.startsWith("/grupos")
  );
}

/** Grading inbox + guardian justifications refresh without polling. */
export function TeacherAcademicRealtime({ realtime }: { realtime: RealtimeConfig }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!realtime.url || !realtime.anonKey) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;

    const bump = () => {
      if (!caresAboutAcademicInbox(pathname)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 900);
    };

    void (async () => {
      const supabase = await getAuthedRealtimeClient(realtime);
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel("teacher-academic")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "submissions" },
          bump,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "submissions" },
          bump,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "attendance_records" },
          bump,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "attendance_records" },
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
  }, [pathname, realtime, router]);

  return null;
}
