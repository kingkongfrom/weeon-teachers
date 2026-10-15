import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const PROFILE_AVATARS_BUCKET = "profile-avatars";
const PROFILE_AVATAR_TTL_SEC = 60 * 60 * 6;

/** Service-role signs private bucket objects. The user JWT only sees its own photo. */
function signingClient(fallback: SupabaseClient): SupabaseClient {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminClient();
  }
  return fallback;
}

export async function signedUrlsForStoragePaths(
  paths: string[],
  fallbackClient: SupabaseClient,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const { data: signed, error } = await signingClient(fallbackClient).storage
    .from(PROFILE_AVATARS_BUCKET)
    .createSignedUrls(unique, PROFILE_AVATAR_TTL_SEC);
  if (error) return out;
  for (const row of signed ?? []) {
    if (row.path && row.signedUrl && !row.error) out.set(row.path, row.signedUrl);
  }
  return out;
}

/** Signed profile photos for mailbox and chat avatars. Missing paths stay absent. */
export async function avatarUrlsByProfileId(
  client: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const unique = [...new Set(profileIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (unique.length === 0) return urls;

  const { data } = await signingClient(client)
    .from("profiles")
    .select("id, avatar_storage_path")
    .in("id", unique);
  const rows = (data ?? []) as Array<{ id: string; avatar_storage_path: string | null }>;
  const signed = await signedUrlsForStoragePaths(
    rows.map((row) => row.avatar_storage_path ?? ""),
    client,
  );
  for (const row of rows) {
    const path = row.avatar_storage_path?.trim();
    if (!path) continue;
    const url = signed.get(path);
    if (url) urls.set(row.id, url);
  }
  return urls;
}

/**
 * Signed photos for people the caller can already see in mail or chat.
 * Keys are profile ids or roster recipient keys. Paths come from a
 * security-definer RPC because `profiles` is own-row only.
 */
export async function avatarUrlsBySubjectKey(
  client: SupabaseClient,
  subjectKeys: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(subjectKeys.map((key) => key.trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const { data, error } = await client.rpc("avatar_paths_for_subject_keys", {
    p_keys: unique,
  });
  if (error || !data) return out;

  const rows = data as Array<{
    subject_key: string;
    avatar_storage_path: string | null;
  }>;
  const signed = await signedUrlsForStoragePaths(
    rows.map((row) => row.avatar_storage_path ?? ""),
    client,
  );
  for (const row of rows) {
    const key = row.subject_key?.trim();
    const path = row.avatar_storage_path?.trim();
    if (!key || !path) continue;
    const url = signed.get(path);
    if (url) out.set(key, url);
  }
  return out;
}
