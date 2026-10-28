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
 * Both are recorded as `performance.measure()` entries named
 * `weeon:subject:active`, `weeon:subject:content`, `weeon:tab:active`,
 * `weeon:tab:content`. They appear in Chrome DevTools → Performance →
 * "Timings", and in the console via `window.weeonPerf.summary()`.
 *
 * Dev only by default; `NEXT_PUBLIC_PERF_INSTRUMENTATION=1` enables it in a
 * preview/production build. Otherwise every function is a no-op.
 */

const ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PERF_INSTRUMENTATION === "1";

/** Marks older than this are dropped so a long session stays cheap. */
const KEEP_MS = 30_000;

type MeasureRecord = { name: string; duration: number; startTime: number };

function prune() {
  if (typeof performance === "undefined") return;
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
    },
  };
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
