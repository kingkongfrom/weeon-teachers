import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";

const loadSchoolRow = cache(async (tenantId: string) => {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("tenants")
    .select("name, settings")
    .eq("id", tenantId)
    .maybeSingle();
  return data;
});

export const loadSchoolName = cache(async (tenantId: string): Promise<string | null> => {
  const data = await loadSchoolRow(tenantId);
  if (!data?.name) return null;
  return String(data.name);
});

/** School coordinates written by the ERP (Configuración → Institución). */
export const loadSchoolLocation = cache(
  async (tenantId: string): Promise<{ latitude: number; longitude: number } | null> => {
    const data = await loadSchoolRow(tenantId);
    const settings = data?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
    const bag = settings as Record<string, unknown>;
    const latitude = bag.weatherLatitude;
    const longitude = bag.weatherLongitude;
    if (typeof latitude !== "number" || !Number.isFinite(latitude)) return null;
    if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  },
);

/** Public URL for `tenants.settings.logoStoragePath` in the school-branding bucket. */
export const loadSchoolLogoUrl = cache(async (tenantId: string): Promise<string | null> => {
  const data = await loadSchoolRow(tenantId);
  const settings = data?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  const path = (settings as Record<string, unknown>).logoStoragePath;
  if (typeof path !== "string" || !path.trim()) return null;
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/school-branding/${path}`;
});
