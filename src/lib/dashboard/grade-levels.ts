import "server-only";

import { createSessionClient } from "@/lib/supabase/session";

/**
 * Every grade level (`Nivel`) the INSTITUTION runs.
 *
 * Grade level belongs to the evaluation, not to the teacher's current
 * assignment, so the list must not be derived from their groups: a teacher
 * reassigned from 1° to 8° would otherwise find the level of an already-saved
 * set missing from its own dropdown.
 *
 * `classes` cannot be read that way directly — its RLS policy only exposes
 * classes a teacher teaches. `list_tenant_grade_levels()` is the narrow,
 * tenant-scoped RPC that returns just the distinct grade strings (migration
 * `20261107010000_tenant_grade_levels.sql` in `weeon-tenants`).
 *
 * Returns `[]` on any failure, including the RPC not being deployed yet, so the
 * Blooket builder still renders.
 */
export async function loadTenantGradeLevels(): Promise<string[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_tenant_grade_levels");
  if (error || !Array.isArray(data)) return [];

  return (data as string[])
    .map((level) => level?.trim())
    .filter((level): level is string => Boolean(level))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
}
