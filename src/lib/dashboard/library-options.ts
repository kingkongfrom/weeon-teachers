import "server-only";

import { createSessionClient } from "@/lib/supabase/session";

/** Subjects of the school, for the library filters and the picker's materias. */
export async function loadSubjectOptions(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string") return [];

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) return [];
  return (data ?? []).map((subject) => ({ id: subject.id, name: subject.name }));
}
