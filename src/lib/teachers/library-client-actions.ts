"use server";

import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";

/**
 * The teachers a library item can be shared with: everyone in the same school,
 * minus the signed-in teacher, annotated with whether they already have access.
 *
 * Exposed as a server action (not a loader) because the share dialog opens on
 * demand; the list is small enough to fetch per open and keeps the page load
 * free of a profile scan.
 */
export async function fetchShareableTeachers(input: {
  itemId: string | null;
}): Promise<{
  ok: boolean;
  teachers: Array<{ id: string; name: string; email: string | null; shared: boolean }>;
}> {
  const parsed = z.object({ itemId: z.string().uuid().nullable() }).safeParse(input);
  if (!parsed.success) return { ok: false, teachers: [] };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string" || !user) return { ok: false, teachers: [] };

  const [{ data: profiles, error }, { data: shares }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email")
      .eq("tenant_id", tenantId)
      .eq("role", "teacher")
      .order("name"),
    parsed.data.itemId
      ? supabase
          .from("exam_library_shares")
          .select("shared_with")
          .eq("item_id", parsed.data.itemId)
      : Promise.resolve({ data: [] as Array<{ shared_with: string }> }),
  ]);

  if (error) return { ok: false, teachers: [] };

  const granted = new Set((shares ?? []).map((share) => share.shared_with));
  const teachers = (profiles ?? [])
    .filter((profile) => profile.id !== user.id)
    .map((profile) => ({
      id: profile.id,
      name: profile.name ?? "",
      email: profile.email ?? null,
      shared: granted.has(profile.id),
    }));

  return { ok: true, teachers };
}
