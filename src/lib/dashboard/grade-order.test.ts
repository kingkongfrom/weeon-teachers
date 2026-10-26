import { describe, expect, it } from "vitest";
import {
  blockBucket,
  moveItem,
  orderColumnsByBlocks,
  splitIntoBlocks,
} from "./grade-order";

describe("moveItem", () => {
  it("moves an item down", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item up", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op for the same index", () => {
    const input = ["a", "b"];
    expect(moveItem(input, 1, 1)).toBe(input);
  });

  it("clamps past the end and never mutates the input", () => {
    const input = ["a", "b", "c"];
    expect(moveItem(input, 0, 99)).toEqual(["b", "c", "a"]);
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("ignores an out-of-range source", () => {
    expect(moveItem(["a"], 3, 0)).toEqual(["a"]);
  });
});

describe("splitIntoBlocks", () => {
  it("groups consecutive items and numbers repeated runs", () => {
    const items = [
      { id: "r1", kind: "t" },
      { id: "r1", kind: "t" },
      { id: "r2", kind: "e" },
      { id: "r1", kind: "t" },
      { id: null, kind: "t" },
    ];
    const blocks = splitIntoBlocks(items, (item) => blockBucket(item.id));
    expect(blocks.map((block) => [block.key, block.ordinal, block.items.length])).toEqual([
      ["r1", 0, 2],
      ["r2", 0, 1],
      ["r1", 1, 1],
      ["__none", 0, 1],
    ]);
  });

  it("returns no blocks for an empty list", () => {
    expect(splitIntoBlocks([], (value: string) => value)).toEqual([]);
  });
});

describe("orderColumnsByBlocks", () => {
  it("reorders groups, keeps order inside a block and appends unknown buckets", () => {
    const columns = [
      { id: "c1", rubroId: "r1" },
      { id: "c2", rubroId: "r2" },
      { id: "c3", rubroId: "r1" },
      { id: "c4", rubroId: null },
      { id: "c5", rubroId: "r3" },
    ];
    const ordered = orderColumnsByBlocks(columns, (column) => column.rubroId, [
      "r2",
      "r1",
      "__none",
    ]);
    expect(ordered.map((column) => column.id)).toEqual(["c2", "c1", "c3", "c4", "c5"]);
  });
});
