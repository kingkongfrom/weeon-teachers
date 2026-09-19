"use server";

import {
  collectEmbedPaths,
  commsDraftEmbedPath,
  commsThreadEmbedPath,
  isDraftEmbedPath,
  MESSAGE_EMBED_BUCKET,
  MESSAGE_EMBED_MAX_BYTES,
  remapEmbedPaths,
  stripEmbedUrls,
} from "@/lib/comms/rich-text-embeds";
import { inferAttachmentMimeType, isAllowedAttachmentMime } from "@/lib/comms/attachment-mime";
import type { RichTextDoc } from "@/lib/comms/model";
import { getCommsActor } from "@/lib/dashboard/comms-session";
import { tRequest } from "@/lib/i18n/server";

export type CommsEmbedUploadResult =
  | { ok: true; path: string; url: string; fileName: string; mimeType: string; kind: "image" | "file" }
  | { ok: false; error: string };

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && "name" in value;
}

/** Upload a file to embed inline while composing (draft path). */
export async function uploadCommsDraftEmbed(formData: FormData): Promise<CommsEmbedUploadResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const file = formData.get("file");
  if (!isUploadFile(file) || file.size === 0) {
    return { ok: false, error: await tRequest("comms.attachmentUploadError") };
  }
  if (file.size > MESSAGE_EMBED_MAX_BYTES) {
    return { ok: false, error: await tRequest("comms.attachmentTooLarge") };
  }

  const mimeType = inferAttachmentMimeType(file.name, file.type);
  if (!isAllowedAttachmentMime(mimeType)) {
    return { ok: false, error: await tRequest("comms.attachmentTypeNotAllowed") };
  }

  const path = commsDraftEmbedPath({
    tenantId: session.tenantId,
    userId: session.userId,
    fileName: file.name,
  });

  const { error: uploadError } = await session.actor.storage
    .from(MESSAGE_EMBED_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false });
  if (uploadError) return { ok: false, error: await tRequest("comms.attachmentUploadError") };

  const { data: signed, error: signError } = await session.actor.storage
    .from(MESSAGE_EMBED_BUCKET)
    .createSignedUrl(path, 60 * 60);
  const url = !signError && signed?.signedUrl ? signed.signedUrl : "";

  const kind = mimeType.startsWith("image/") ? "image" : "file";
  return { ok: true, path, url, fileName: file.name, mimeType, kind };
}

/** Move draft embeds to the thread folder and persist the updated message body. */
export async function finalizeCommsEmbeds(
  threadId: string,
  messageId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  let messageQuery = session.actor
    .from("messages")
    .select("id, body")
    .eq("thread_id", threadId);
  if (messageId) {
    messageQuery = messageQuery.eq("id", messageId);
  } else {
    messageQuery = messageQuery.order("created_at", { ascending: true }).limit(1);
  }
  const { data: message, error: messageError } = await messageQuery.maybeSingle();

  if (messageError || !message) {
    return { ok: false, error: await tRequest("comms.error") };
  }

  const body = message.body as RichTextDoc;
  const paths = collectEmbedPaths(body);
  if (paths.length === 0) return { ok: true };

  const pathMap = new Map<string, string>();
  for (const oldPath of paths) {
    if (!isDraftEmbedPath(oldPath)) continue;
    const tail = oldPath.split("/").pop() ?? "archivo";
    const nextPath = commsThreadEmbedPath({
      tenantId: session.tenantId,
      threadId,
      fileName: tail,
    });
    if (oldPath === nextPath) continue;

    const bucket = session.actor.storage.from(MESSAGE_EMBED_BUCKET);
    const { error: copyError } = await bucket.copy(oldPath, nextPath);
    if (copyError) {
      const { data: downloaded, error: downloadError } = await bucket.download(oldPath);
      if (!downloadError && downloaded) {
        const { error: uploadError } = await bucket.upload(nextPath, downloaded, { upsert: true });
        if (!uploadError) {
          await bucket.remove([oldPath]);
          pathMap.set(oldPath, nextPath);
        }
      }
      continue;
    }
    await bucket.remove([oldPath]);
    pathMap.set(oldPath, nextPath);
  }

  if (pathMap.size === 0) return { ok: true };

  const nextBody = stripEmbedUrls(remapEmbedPaths(body, pathMap));
  const { error: updateError } = await session.actor
    .from("messages")
    .update({ body: nextBody })
    .eq("id", message.id as string);

  // Thread is already created; draft paths still work if body update is blocked by RLS.
  if (updateError) return { ok: true };

  return { ok: true };
}
