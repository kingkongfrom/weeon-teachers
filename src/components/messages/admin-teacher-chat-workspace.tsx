"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import {
  bindRealtimeAuthRefresh,
  getAuthedRealtimeClient,
  type RealtimeConfig,
} from "@/lib/supabase/browser";
import { AdminTeacherChatThread } from "@/components/messages/admin-teacher-chat-thread";
import { TONE_AVATAR } from "@/lib/dashboard/tones";
import { guardianInitial } from "@/lib/messages/chat-display";
import { COMMS_ADMIN_CHAT } from "@/lib/comms/paths";
import type {
  AdminTeacherChatDetail,
  AdminTeacherChatSummary,
} from "@/lib/dashboard/admin-teacher-chat";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

/** Admin ↔ teacher chat — teachers only reply; school admin starts conversations. */
export function AdminTeacherChatWorkspace({
  conversations,
  selectedId,
  selectedDetail,
  me,
  realtime,
}: {
  conversations: AdminTeacherChatSummary[];
  selectedId: string | null;
  selectedDetail: AdminTeacherChatDetail | null;
  me: string;
  realtime: RealtimeConfig;
}) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();
  const { url: realtimeUrl, anonKey: realtimeAnonKey } = realtime;
  const [listQuery, setListQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const term = listQuery.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (row) =>
        row.counterpartName.toLowerCase().includes(term) ||
        row.preview.toLowerCase().includes(term),
    );
  }, [conversations, listQuery]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel("admin-teacher-chat-list-teacher")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_teacher_chat_messages" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 800);
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_teacher_chat_conversations" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 800);
          },
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
  }, [realtimeUrl, realtimeAnonKey, router]);

  const showThread = Boolean(selectedId && selectedDetail);
  const showListOnMobile = !showThread;

  return (
    <div className="flex h-[min(576px,calc(100vh-12rem))] min-h-[304px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside
          className={cn(
            "flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r",
            showListOnMobile ? "flex" : "hidden lg:flex",
          )}
        >
          {conversations.length > 0 ? (
            <div className="shrink-0 border-b border-border px-3 py-2">
              <label className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1">
                <Search className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                <input
                  value={listQuery}
                  onChange={(event) => setListQuery(event.target.value)}
                  placeholder={m.chatSearchPlaceholder}
                  className="h-5 w-full bg-transparent text-xs text-foreground outline-none placeholder:text-foreground/40"
                />
              </label>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
                <MessageCircle className="h-7 w-7 text-foreground/20" aria-hidden />
                <p className="text-sm font-semibold text-foreground">{m.chatAdminEmpty}</p>
                <p className="text-xs font-medium text-foreground/50">{m.chatAdminEmptyBody}</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs font-medium text-foreground/45">
                {m.chatPickerEmpty}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {filteredConversations.map((conversation) => {
                  const active = conversation.id === selectedId;
                  return (
                    <li key={conversation.id}>
                      <Link
                        href={`${COMMS_ADMIN_CHAT}/${conversation.id}`}
                        className={cn(
                          "ui-hover flex items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                          active
                            ? "bg-surface-muted ring-1 ring-border"
                            : "hover:bg-surface-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                            TONE_AVATAR.blue,
                          )}
                        >
                          {guardianInitial(conversation.counterpartName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm text-foreground",
                                conversation.unread ? "font-bold" : "font-semibold",
                              )}
                            >
                              {conversation.counterpartName}
                            </span>
                            <span className="shrink-0 pt-0.5 text-[10px] font-medium text-foreground/40">
                              {relativeTime(conversation.lastMessageAt)}
                            </span>
                          </div>
                          {conversation.preview.trim() ? (
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-foreground/40">
                              {conversation.preview}
                            </span>
                          ) : (
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-foreground/40">
                              {m.chatNoMessagesYet}
                            </span>
                          )}
                        </span>
                        {conversation.unread ? (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-[#0f766e] dark:bg-[#5eead4]"
                            aria-hidden
                          />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-col",
            showThread ? "flex" : "hidden lg:flex",
          )}
        >
          {showThread && selectedDetail ? (
            <AdminTeacherChatThread
              embedded
              conversationId={selectedDetail.id}
              me={me}
              counterpartName={selectedDetail.counterpartName}
              initialMessages={selectedDetail.messages}
              realtime={realtime}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted">
                <MessageCircle className="h-6 w-6 text-foreground/25" aria-hidden />
              </div>
              <div className="max-w-xs space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{m.chatAdminTitle}</p>
                <p className="text-xs font-medium text-foreground/50">{m.chatAdminSelectPrompt}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
