"use client";

import { useRouteMeasure } from "@/lib/perf/nav-timing";

/**
 * Mounts the app-wide route timing. Lives in its own component so the root
 * layout can stay a server component; renders nothing.
 */
export function RouteTiming() {
  useRouteMeasure();
  return null;
}
