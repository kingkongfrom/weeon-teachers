/** A gradebook bucket: a rubric node or the fallback group for columns that
 * have no rubro. `id === null` is the "Sin rubro" bucket. */
export type Bucket = { id: string | null } | null | undefined;

/**
 * Reorders a list by dropping `from` and inserting it at `to` (both indexes in
 * the original list). Clamped, so a drag past either end simply lands last or
 * first. Returns a new array; the input is never mutated.
 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  if (from < 0 || from >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  const target = Math.max(0, Math.min(next.length, to));
  next.splice(target, 0, item);
  return next;
}

/**
 * Drops the runs of consecutive items that share the same `key` and stamps each
 * one with its ordinal within its run (0, 1, 2…). A column's ordinal is what
 * makes two blocks of the same rubro distinguishable, so a rubro can legitimately
 * appear in more than one block — "Tareas 5%" twice, or a 100 % "Quiz" split
 * between exams.
 *
 * `ordinal` must be memoized by the caller (it returns new arrays every call).
 */
export function splitIntoBlocks<T>(
  items: T[],
  keyOf: (item: T) => string,
): Array<{ key: string; ordinal: number; items: T[] }> {
  const blocks: Array<{ key: string; ordinal: number; items: T[] }> = [];
  for (const item of items) {
    const key = keyOf(item);
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      const ordinal = blocks.filter((block) => block.key === key).length;
      blocks.push({ key, ordinal, items: [item] });
    }
  }
  return blocks;
}

/**
 * Bucket the block belongs to. Columns without a rubro share the `null` bucket,
 * so moving a column out of a rubro drops it into the "Sin rubro" area (or
 * creates that area when it is the first one).
 */
export function blockBucket(id: string | null): string {
  return id ?? "__none";
}

/**
 * Applies a block order to every column: running through the ordered buckets
 * and blocks, columns keep their relative order inside each block. Used by the
 * gradebook to render (and to persist) the teacher's block order.
 */
export function orderColumnsByBlocks<T>(
  columns: T[],
  idOf: (column: T) => string | null,
  ordered: string[],
): T[] {
  const grouped = new Map<string, T[]>();
  for (const column of columns) {
    const bucket = blockBucket(idOf(column));
    const list = grouped.get(bucket);
    if (list) list.push(column);
    else grouped.set(bucket, [column]);
  }
  const out: T[] = [];
  for (const bucket of ordered) {
    const list = grouped.get(bucket);
    if (!list) continue;
    out.push(...list);
    grouped.delete(bucket);
  }
  for (const list of grouped.values()) out.push(...list);
  return out;
}
