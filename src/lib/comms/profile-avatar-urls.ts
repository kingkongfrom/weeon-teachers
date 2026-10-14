import type { SupabaseClient } from "@supabase/supabase-js";

const PROFILE_AVATARS_BUCKET = "profile-avatars";
const PROFILE_AVATAR_TTL_SEC = 60 * 60 * 6;

/** Signed profile photos for mailbox and chat avatars. Missing paths stay absent. */
export async function avatarUrlsByProfileId(
  client: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const unique = [...new Set(profileIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (unique.length === 0) return urls;

  const { data } = await client
    .from("profiles")
    .select("id, avatar_storage_path")
    .in("id", unique);
  const rows = (data ?? []) as Array<{ id: string; avatar_storage_path: string | null }>;
  const paths = rows
    .map((row) => row.avatar_storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) return urls;

  const { data: signed } = await client.storage
    .from(PROFILE_AVATARS_BUCKET)
    .createSignedUrls(paths, PROFILE_AVATAR_TTL_SEC);
  const byPath = new Map<string, string>();
  for (const row of signed ?? []) {
    if (row.path && row.signedUrl) byPath.set(row.path, row.signedUrl);
  }
  for (const row of rows) {
    if (!row.avatar_storage_path) continue;
    const url = byPath.get(row.avatar_storage_path);
    if (url) urls.set(row.id, url);
  }
  return urls;
}
