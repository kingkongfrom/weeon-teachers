import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";

export const loadSchoolName = cache(
  async (tenantId: string): Promise<string | null> => {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();
  if (!data?.name) return null;
  return String(data.name);
  },
);
