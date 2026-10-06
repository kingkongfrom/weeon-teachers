import Link from "next/link";
import { ChevronRight, Mail, MessageCircle, PenLine } from "lucide-react";
import { GuardianChatIdentity } from "@/components/messages/guardian-chat-identity";
import { formatRelativeListTime } from "@/lib/comms/relative-list-time";
import { COMMS_CHAT, COMMS_COMPOSE, COMMS_MESSAGES } from "@/lib/comms/paths";
import { TONE_AVATAR } from "@/lib/dashboard/tones";
import type { MessageThreadSummary } from "@/lib/dashboard/messages";
import { guardianInitial } from "@/lib/messages/chat-display";
import type { ChatConversationSummary } from "@/lib/messages/chat-model";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

const INBOX_PREVIEW = 5;
const CHAT_PREVIEW = 5;

type ComunicacionHubActivityProps = {
  inbox: MessageThreadSummary[];
  chats: ChatConversationSummary[];
  className?: string;
};

function ColumnEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="max-w-[16rem] text-xs font-medium text-foreground/50">{body}</p>
    </div>
  );
}

/** Split inbox + chat previews — full width, two panes (not a cramped sidebar feed). */
export async function ComunicacionHubActivity({
  inbox,
  chats,
  className,
}: ComunicacionHubActivityProps) {
  const t = await getT();
  const m = t.messages;
  const inboxRows = inbox.slice(0, INBOX_PREVIEW);
  const chatRows = chats.slice(0, CHAT_PREVIEW);
  const totallyEmpty = inbox.length === 0 && chats.length === 0;

  if (totallyEmpty) {
    return (
      <section
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface px-6 py-14 text-center sm:py-16",
          className,
        )}
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-white shadow-sm"
          aria-hidden
        >
          <PenLine className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="max-w-md space-y-1">
          <p className="text-base font-bold text-foreground">{m.hubRecentEmptyTitle}</p>
          <p className="text-sm font-medium text-foreground/55">{m.hubRecentEmptyDescription}</p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={COMMS_COMPOSE}
            className="brand-gradient inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
          >
            {m.compose}
          </Link>
          <Link
            href={COMMS_CHAT}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground/80 transition-colors hover:bg-surface-muted"
          >
            {m.chatNew}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface",
        className,
      )}
    >
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Inbox pane */}
        <div className="flex min-h-[14rem] flex-col sm:min-h-[16rem]">
          <header className="flex flex-col gap-2 border-b border-border px-2 py-2.5 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between min-[400px]:gap-3 sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white sm:h-8 sm:w-8 sm:rounded-xl",
                  TONE_AVATAR.blue,
                )}
                aria-hidden
              >
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-foreground sm:text-sm">{m.hubPreviewInboxTitle}</h2>
                <p className="hidden truncate text-xs font-medium text-foreground/45 min-[400px]:block">
                  {m.hubPreviewInboxHint}
                </p>
              </div>
            </div>
            <Link
              href={`${COMMS_MESSAGES}?folder=inbox`}
              className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-foreground/50 hover:text-foreground sm:text-xs"
            >
              {m.hubViewAllMessages}
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            </Link>
          </header>
          {inboxRows.length === 0 ? (
            <ColumnEmpty title={m.hubPreviewInboxEmpty} body={m.hubPreviewInboxEmptyBody} />
          ) : (
            <ul className="flex flex-1 flex-col px-2 py-1">
              {inboxRows.map((thread) => (
                <li key={thread.id}>
                  <Link
                    href={`${COMMS_MESSAGES}/${thread.id}`}
                    className="ui-hover flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted/60"
                  >
                    <span
                      className={cn(
                        "mt-2 h-2 w-2 shrink-0 rounded-full",
                        thread.unread ? "bg-[#2563eb]" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            thread.unread ? "font-bold text-foreground" : "font-semibold text-foreground/90",
                          )}
                        >
                          {thread.mine ? thread.counterpart : (thread.authorName ?? thread.counterpart)}
                        </span>
                        <span className="shrink-0 text-[10px] font-medium tabular-nums text-foreground/40">
                          {formatRelativeListTime(thread.lastMessageAt)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate text-sm",
                          thread.unread ? "font-semibold text-foreground" : "font-medium text-foreground/75",
                        )}
                      >
                        {thread.subject}
                      </span>
                      {thread.preview ? (
                        <span className="mt-0.5 block truncate text-xs text-foreground/45">
                          {thread.preview}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chat pane */}
        <div className="flex min-h-[14rem] flex-col sm:min-h-[16rem]">
          <header className="flex flex-col gap-2 border-b border-border px-2 py-2.5 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between min-[400px]:gap-3 sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white sm:h-8 sm:w-8 sm:rounded-xl",
                  TONE_AVATAR.green,
                )}
                aria-hidden
              >
                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-foreground sm:text-sm">{m.hubPreviewChatTitle}</h2>
                <p className="hidden truncate text-xs font-medium text-foreground/45 min-[400px]:block">
                  {m.hubPreviewChatHint}
                </p>
              </div>
            </div>
            <Link
              href={COMMS_CHAT}
              className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-foreground/50 hover:text-foreground sm:text-xs"
            >
              {m.hubViewAllChat}
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            </Link>
          </header>
          {chatRows.length === 0 ? (
            <ColumnEmpty title={m.chatEmpty} body={m.chatEmptyBody} />
          ) : (
            <ul className="flex flex-1 flex-col px-2 py-1">
              {chatRows.map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`${COMMS_CHAT}/${conversation.id}`}
                    className="ui-hover flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted/60"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                        conversation.channel === "admin" ? TONE_AVATAR.blue : TONE_AVATAR.green,
                      )}
                    >
                      {guardianInitial(conversation.counterpartName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        {conversation.channel === "admin" ? (
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-sm",
                                conversation.unread ? "font-bold text-foreground" : "font-semibold text-foreground/90",
                              )}
                            >
                              {conversation.counterpartName}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-foreground/45">
                              {m.chatAdminSubtitle}
                            </span>
                          </span>
                        ) : (
                          <GuardianChatIdentity
                            name={conversation.counterpartName}
                            classLabel={conversation.classLabel}
                            studentName={conversation.studentName}
                            variant="list"
                            className={cn(
                              "min-w-0 flex-1",
                              conversation.unread && "[&>span:first-child]:font-bold",
                            )}
                          />
                        )}
                        <span className="shrink-0 pt-0.5 text-[10px] font-medium tabular-nums text-foreground/40">
                          {formatRelativeListTime(conversation.lastAt)}
                        </span>
                      </div>
                      {conversation.lastBody.trim() ? (
                        <span className="mt-0.5 block truncate text-xs text-foreground/45">
                          {conversation.lastBody}
                        </span>
                      ) : null}
                    </span>
                    {conversation.unread ? (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0f766e]" aria-hidden />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
