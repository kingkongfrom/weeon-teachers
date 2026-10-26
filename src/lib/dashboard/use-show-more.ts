"use client";

import { useState } from "react";

/**
 * "Show more" for a long list.
 *
 * A teacher's Trabajo de clase accumulates a whole term of material, and a list
 * that renders everything pushes the second column (and the tabs above it) far
 * off screen. Showing a first page keeps both lists the same height so the two
 * columns stay comparable, which is the whole reason they sit side by side.
 *
 * `step` is small on purpose: 3–4 rows is roughly a screenful in this layout.
 * `remaining` drives the button label ("Ver 4 más"), so the teacher always knows
 * how much is left rather than clicking blind.
 */
export function useShowMore<T>(items: T[], initial = 4, step = 4) {
  const [limit, setLimit] = useState(initial);

  // A new subject filter changes the list; start from the first page again so
  // the reset is not remembered against a different set of items.
  const key = items.length;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setLimit(initial);
  }

  const visible = items.slice(0, limit);
  const remaining = Math.max(0, items.length - visible.length);

  return {
    visible,
    remaining,
    expanded: remaining === 0 && items.length > initial,
    showMore: () => setLimit((current) => current + step),
  };
}
