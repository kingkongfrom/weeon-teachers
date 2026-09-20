"use client";

import { getRealtimeClient, type RealtimeConfig } from "@/lib/supabase/browser";
import { profileAvatarStoragePath } from "@/lib/profile/profile-avatar-image";

const BUCKET = "profile-avatars";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type ProfileAvatarUploadResult =
  | { ok: true; storagePath: string }
  | { ok: false; error: string };

export async function signProfileAvatarUrl(
  config: RealtimeConfig,
  storagePath: string | null | undefined,
): Promise<string | null> {
  const trimmed = storagePath?.trim();
  if (!trimmed) return null;

  const supabase = getRealtimeClient(config);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Browser upload — same bucket + RPC contract as weeon-mobile. */
export async function uploadProfileAvatarClient(
  config: RealtimeConfig,
  tenantId: string,
  profileId: string,
  bytes: Blob,
): Promise<ProfileAvatarUploadResult> {
  const supabase = getRealtimeClient(config);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "not_authenticated" };
  }

  if (user.id !== profileId) {
    return { ok: false, error: "session_mismatch" };
  }

  const storagePath = profileAvatarStoragePath(tenantId, profileId);
  const body =
    bytes instanceof File
      ? bytes
      : new File([bytes], "avatar.jpg", { type: "image/jpeg" });

  if (body.size === 0) {
    return { ok: false, error: "invalid_file" };
  }

  if (body.size > 2 * 1024 * 1024) {
    return { ok: false, error: "file_too_large" };
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { error: registerError } = await supabase.rpc("set_my_profile_avatar", {
    p_storage_path: storagePath,
  });
  if (registerError) {
    return { ok: false, error: registerError.message };
  }

  return { ok: true, storagePath };
}

/** Maps Supabase / RPC errors to drawer copy keys (see messages drawer.*). */
export function profileAvatarErrorKey(error: string): "profilePhotoForbidden" | "profilePhotoError" {
  const lower = error.toLowerCase();
  if (lower.includes("forbidden") || lower.includes("not allowed")) {
    return "profilePhotoForbidden";
  }
  return "profilePhotoError";
}
