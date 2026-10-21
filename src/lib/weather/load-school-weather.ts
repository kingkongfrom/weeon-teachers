import "server-only";

import { cache } from "react";
import { loadSchoolLocation } from "@/lib/dashboard/school";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/weather/location";
import {
  fetchMetNorwayWeather,
  type WeatherSnapshot,
} from "@/lib/weather/met-norway";

/**
 * Weather for the `/inicio` date block. Server-side only: coordinates come from
 * the school's `tenants.settings` (set in the ERP), with San José as fallback,
 * and the MET Norway request is cached for 30 minutes. Failures are silent.
 */
export const loadSchoolWeather = cache(
  async (tenantId: string | null): Promise<WeatherSnapshot | null> => {
    if (!tenantId) return null;
    try {
      const location = await loadSchoolLocation(tenantId);
      const latitude = location?.latitude ?? DEFAULT_WEATHER_LOCATION.latitude;
      const longitude = location?.longitude ?? DEFAULT_WEATHER_LOCATION.longitude;
      return await fetchMetNorwayWeather(latitude, longitude);
    } catch {
      return null;
    }
  },
);
