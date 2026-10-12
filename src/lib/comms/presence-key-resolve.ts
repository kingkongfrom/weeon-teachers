import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPresenceLookupKey(value: string): boolean {
  return UUID_LIKE.test(value.trim());
}

type ResolveRow = { lookup_key: string; profile_id: string };

/** Map contact/recipient keys to Auth profile ids for `profile_presence`. */
export async function resolvePresenceProfileIds(
  supabase: SupabaseClient,
  lookupKeys: string[],
): Promise<Map<string, string>> {
  const keys = [...new Set(lookupKeys.map((key) => key.trim()).filter(isPresenceLookupKey))];
  const map = new Map<string, string>();
  if (keys.length === 0) return map;

  const { data, error } = await supabase.rpc("resolve_profile_presence_keys", {
    p_keys: keys,
  });
  if (error) {
    for (const key of keys) map.set(key, key);
    return map;
  }
  for (const row of (data ?? []) as ResolveRow[]) {
    if (row.lookup_key && row.profile_id) map.set(row.lookup_key, row.profile_id);
  }
  for (const key of keys) {
    if (!map.has(key)) map.set(key, key);
  }
  return map;
}
