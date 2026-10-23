"use client";

import { useEffect, useState } from "react";

import { schoolClock } from "@/lib/dashboard/clock";

/** Tick on whole seconds so the display never drifts. */
function scheduleTick(update: () => void): () => void {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const step = () => {
    update();
    handle = setTimeout(step, 1000 - (Date.now() % 1000));
  };
  handle = setTimeout(step, 1000 - (Date.now() % 1000));
  return () => {
    if (handle) clearTimeout(handle);
  };
}

/**
 * Digital clock for the school timezone. The server renders `initialTime`, so
 * the first paint is correct; the client then ticks every second and resyncs
 * when the tab becomes visible again (background tabs throttle timers).
 */
export function LiveClock({
  initialTime,
  locale,
  className,
}: {
  initialTime: string;
  locale: "es" | "en";
  className?: string;
}) {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    const update = () => setTime(schoolClock(new Date(), locale));
    let cleanup = scheduleTick(update);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      cleanup();
      update();
      cleanup = scheduleTick(update);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [locale]);

  return (
    <span className={className} suppressHydrationWarning>
      {time}
    </span>
  );
}
