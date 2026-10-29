import "server-only";

import { NextResponse } from "next/server";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

/**
 * Ingests aggregated navigation timings from the teacher app and folds them into
 * `public.nav_timings` (hourly buckets, read by the Ops observability panel).
 *
 * Contract
 * - `POST { samples: [{ route, kind, phase, ms }] }`, at most 50 entries.
 * - The session decides the tenant; the body can never choose one.
 * - Everything is validated and clamped here — the client is untrusted, and a
 *   bad row must never reach the table.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SAMPLES = 50;
const MAX_ROUTE = 120;
const MAX_MS = 600_000;
const KINDS = new Set(["subject", "tab"]);
const PHASES = new Set(["active", "content"]);

type Sample = { route: string; kind: string; phase: string; ms: number };

function parseSamples(body: unknown): Sample[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { samples?: unknown }).samples;
  if (!Array.isArray(raw)) return [];

  const samples: Sample[] = [];
  for (const entry of raw.slice(0, MAX_SAMPLES)) {
    if (!entry || typeof entry !== "object") continue;
    const { route, kind, phase, ms } = entry as Record<string, unknown>;
    if (typeof route !== "string" || typeof kind !== "string" || typeof phase !== "string") {
      continue;
    }
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0 || ms > MAX_MS) continue;
    if (!KINDS.has(kind) || !PHASES.has(phase)) continue;

    const cleanRoute = route.trim().slice(0, MAX_ROUTE);
    if (!cleanRoute.startsWith("/")) continue;

    samples.push({ route: cleanRoute, kind, phase, ms: Math.round(ms) });
  }
  return samples;
}

export async function POST(request: Request) {
  // No session → 204, not 401: a beacon must never produce console noise or a
  // retry loop on a signed-out tab.
  const session = await getTeacherSession();
  if (!session) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const samples = parseSamples(body);
  if (samples.length === 0) return new NextResponse(null, { status: 204 });

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("record_nav_timings", {
    p_tenant_id: session.tenantId,
    p_surface: "teachers",
    p_samples: samples,
  });

  // A failed write is a missing data point, never a user-facing error — but it
  // must not be silent either: a revoked grant once made this return 204 while
  // the panel showed "0 muestras" with nothing in the logs.
  if (error) {
    console.error("[telemetry] nav_timings write failed:", error.message);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
