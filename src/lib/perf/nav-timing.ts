"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Perceived-latency instrumentation for the aula virtual.
 *
 * "Switching subjects feels slow" is not measurable from a commit message. The
 * two things that decide whether a navigation feels instant are
 *
 *   1. **time to active** — when the clicked pill visibly becomes the active
 *      one (feedback), and
 *   2. **time to content** — when the new subject's lists are on screen.
 *
 * Every measured navigation leaves `performance.measure()` entries
 * (`weeon:subject:active`, `weeon:subject:content`, `weeon:tab:…`) that show up
 * in DevTools → Performance → Timings and in `window.weeonPerf.summary()`.
 *
 * **Production telemetry.** In a production build the durations are also
 * batched and posted to `/api/telemetry/nav`, which stores hourly aggregates in
 * `public.nav_timings` for the Ops console. That costs one small `fetch` per
 * 20 s at most (`sendBeacon` on page hide), carries no identifiers beyond the
 * session cookie, and samples 25 % of navigations so a whole school does not
 * add measurable load. Set `NEXT_PUBLIC_PERF_TELEMETRY=0` to switch it off.
 *
 * Dev treats every interaction as a local measurement and never posts.
 */

const IS_DEV = process.env.NODE_ENV !== "production";
/** Telemetry is on in production unless explicitly disabled; dev never posts. */
const TELEMETRY_ON =
  !IS_DEV && process.env.NEXT_PUBLIC_PERF_TELEMETRY !== "0";
const ENABLED =
  IS_DEV || process.env.NEXT_PUBLIC_PERF_INSTRUMENTATION === "1" || TELEMETRY_ON;

const TELEMETRY_ENDPOINT = "/api/telemetry/nav";
/** Fraction of navigations sent upstream (1 when `NEXT_PUBLIC_PERF_TELEMETRY=all`). */
const SAMPLE_RATE =
  process.env.NEXT_PUBLIC_PERF_TELEMETRY === "all" ? 1 : 0.25;
/** Flush cadence and batch cap for the outbox. */
const FLUSH_MS = 20_000;
const MAX_BATCH = 50;

type PendingSample = {
  route: string;
  kind: "subject" | "tab";
  phase: "active" | "content";
  ms: number;
};

const outbox: PendingSample[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;

/** Stored in the payload so Ops can split by screen without parsing URLs. */
let currentRoute = "unknown";

/** Marks older than this are dropped so a long session stays cheap. */
const KEEP_MS = 30_000;

type MeasureRecord = { name: string; duration: number; startTime: number };

/**
 * Records the route template for the *next* sample ("/aula-virtual/[classId]").
 * Called once per measured navigation so Ops can group by screen.
 */
export function setTelemetryRoute(route: string) {
  currentRoute = route || "unknown";
}

function installFlushListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  // A tab being closed or hidden is the last chance to send what we have.
  const flushOnHide = () => {
    if (document.visibilityState === "hidden") flush(true);
  };
  document.addEventListener("visibilitychange", flushOnHide);
  window.addEventListener("pagehide", () => flush(true));
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush(false);
  }, FLUSH_MS);
}

/**
 * Posts the outbox. `useBeacon` survives a page hide; otherwise plain `fetch`
 * with `keepalive` so navigation does not cancel it.
 *
 * Failures are swallowed on purpose: telemetry must never surface an error or
 * retry against a struggling server.
 */
function flush(useBeacon: boolean) {
  if (typeof window === "undefined" || outbox.length === 0) return;

  const payload = JSON.stringify({ samples: outbox.splice(0, MAX_BATCH) });

  // Keep the remainder on the next tick rather than dropping it.
  if (outbox.length > 0) scheduleFlush();

  try {
    if (useBeacon && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(TELEMETRY_ENDPOINT, new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    // Ignore: a measurement that cannot be sent is not a product error.
  }
}

function recordSample(kind: "subject" | "tab", phase: "active" | "content", ms: number) {
  if (!TELEMETRY_ON || typeof window === "undefined") return;
  if (!Number.isFinite(ms) || ms < 0 || ms > 600_000) return;
  // Sampling keeps the volume proportional to real usage instead of to clicks.
  if (Math.random() > SAMPLE_RATE) return;

  installFlushListeners();
  outbox.push({ route: currentRoute, kind, phase, ms: Math.round(ms) });
  if (outbox.length >= MAX_BATCH) flush(false);
  else scheduleFlush();
}

function prune() {  if (typeof performance === "undefined") return;
  const now = performance.now();
  for (const entry of performance.getEntriesByType("mark")) {
    if (now - entry.startTime > KEEP_MS) performance.clearMarks(entry.name);
  }
}

/**
 * Starts a timed interaction and returns the functions that end its phases.
 * `performance.mark` only takes a name, so the id is applied when the phases
 * are closed into measures (`name` + `id`), not when the start mark is made.
 */
export function startNav(kind: "subject" | "tab", target: string) {
  if (!ENABLED || typeof performance === "undefined") {
    return { markActive: () => {}, markContent: () => {} };
  }
  prune();
  performance.mark("weeon:nav:start");

  let doneActive = false;
  let doneContent = false;

  return {
    /** The pill is active and the lists show the new subject. */
    markActive() {
      if (doneActive) return;
      doneActive = true;
      performance.mark("weeon:nav:active");
      performance.measure(`weeon:${kind}:active`, {
        start: "weeon:nav:start",
        end: "weeon:nav:active",
        detail: target,
      });
      recordSample(kind, "active", measureSince("weeon:nav:start"));
    },
    /** Everything for that state is mounted (parents → children painted). */
    markContent() {
      if (doneContent) return;
      doneContent = true;
      performance.mark("weeon:nav:content");
      performance.measure(`weeon:${kind}:content`, {
        start: "weeon:nav:start",
        end: "weeon:nav:content",
        detail: target,
      });
      recordSample(kind, "content", measureSince("weeon:nav:start"));
    },
  };
}

/** Milliseconds from a mark to now, for the telemetry sample. */
function measureSince(mark: string): number {
  const entries = performance.getEntriesByName(mark, "mark");
  const last = entries[entries.length - 1];
  return last ? performance.now() - last.startTime : -1;
}

/** All nav measurements, newest first — for a debug panel or a console table. */
export function readNavMeasures(): MeasureRecord[] {
  if (typeof performance === "undefined") return [];
  return performance
    .getEntriesByType("measure")
    .filter((entry) => entry.name.startsWith("weeon:"))
    .map((entry) => ({
      name: entry.name,
      duration: Math.round(entry.duration * 10) / 10,
      startTime: Math.round(entry.startTime),
    }))
    .sort((a, b) => b.startTime - a.startTime);
}

/** Summarise `active` / `content` timings: count, median, p90, max. */
export function summarizeNav(kind: "subject" | "tab") {
  const values = (phase: "active" | "content") =>
    readNavMeasures()
      .filter((entry) => entry.name === `weeon:${kind}:${phase}`)
      .map((entry) => entry.duration)
      .sort((a, b) => a - b);

  const stats = (list: number[]) => {
    if (list.length === 0) return null;
    const at = (p: number) => list[Math.min(list.length - 1, Math.floor(p * list.length))]!;
    return {
      n: list.length,
      median: at(0.5),
      p90: at(0.9),
      max: list[list.length - 1]!,
    };
  };

  return { active: stats(values("active")), content: stats(values("content")) };
}

/**
 * Arms a measurement before `router.replace()` and fires `markContent` on the
 * next frame after the state settles, so "content" means *painted*, not merely
 * *rendered*.
 */
export function useNavMeasure(kind: "subject" | "tab") {
  const pending = useRef<ReturnType<typeof startNav> | null>(null);
  const [lastTarget, setLastTarget] = useState<string | null>(null);

  const begin = useCallback(
    (target: string) => {
      ensurePerfConsoleHelpers();
      pending.current = startNav(kind, target);
      setLastTarget(target);
      // Active state is synchronous with React's commit; the next frame paints it.
      requestAnimationFrame(() => pending.current?.markActive());
    },
    [kind],
  );

  // Content phase: after the resulting render/paint.
  useEffect(() => {
    if (!lastTarget) return;
    const handle = requestAnimationFrame(() => {
      pending.current?.markContent();
      pending.current = null;
    });
    return () => cancelAnimationFrame(handle);
  }, [lastTarget]);

  return begin;
}

/**
 * Dev-only console helpers, installed as a side effect the first time a
 * measured navigation runs (so nothing extra has to be mounted in the layout):
 *
 *   window.weeonPerf.table()   → last navigations
 *   window.weeonPerf.summary() → median / p90 for subject and tab switches
 */
function ensurePerfConsoleHelpers() {
  if (!ENABLED || typeof window === "undefined") return;
  const target = window as unknown as { weeonPerf?: unknown };
  if (target.weeonPerf) return;
  target.weeonPerf = {
    table: () => console.table(readNavMeasures().slice(0, 30)),
    summary: () => ({
      subject: summarizeNav("subject"),
      tab: summarizeNav("tab"),
    }),
    reset: () => {
      for (const entry of performance.getEntriesByType("measure")) {
        if (entry.name.startsWith("weeon:")) performance.clearMarks(entry.name);
      }
      performance.clearMeasures();
    },
  };
}
