import "server-only";

import type { createSessionClient } from "@/lib/supabase/session";

const BUCKET = "attendance-justifications";
const TTL_SEC = 60 * 60;

/**
 * Signed URLs for justification attachments, in one storage call.
 *
 * The inbox and the attendance loader used to sign one path per row, so a
 * class with a few pending notes paid a storage round trip for each — and the
 * class page loaded the whole inbox just to show a badge.
 */
export async function signJustificationPaths(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  paths: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(paths.filter((path) => path.length > 0))];
  if (unique.length === 0) return result;

  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, TTL_SEC);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl && !row.error) result.set(row.path, row.signedUrl);
  }
  return result;
}
