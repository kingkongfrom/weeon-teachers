import "server-only";

/** Asks the school ERP to mail the short notice. A failure does not block the circular. */
export async function requestMessageNotice(
  accessToken: string | undefined,
  input: { threadId: string; messageId?: string },
): Promise<void> {
  try {
    const origin = noticeOrigin();
    const token = accessToken?.trim();
    if (!origin || !token) return;

    await fetch(`${origin}/api/comms/message-notice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        threadId: input.threadId,
        ...(input.messageId ? { messageId: input.messageId } : {}),
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    console.error("[email] message notice request failed", input.threadId, message);
  }
}

function noticeOrigin(): string | null {
  const raw = (process.env.WEEON_APP_ORIGIN?.trim() || "https://app.weeon.school").replace(/\/$/, "");
  if (/^https:\/\//i.test(raw)) return raw;
  if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost(?::\d+)?$/i.test(raw)) return raw;
  return null;
}
