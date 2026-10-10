import { describe, it, expect } from "vitest";
import {
  addMonths,
  capitalize,
  firstOfMonth,
  isSameDay,
  layoutTimedRanges,
  minutesFromMidnight,
  monthCells,
  parseAnchor,
  parseCalendarView,
  rangeFor,
  shiftAnchor,
  timeBlockOffset,
  weekdayIndex,
} from "@/lib/dashboard/month";

describe("parseCalendarView", () => {
  it("accepts known views and falls back to month", () => {
    expect(parseCalendarView("week")).toBe("week");
    expect(parseCalendarView("day")).toBe("day");
    expect(parseCalendarView("agenda")).toBe("agenda");
    expect(parseCalendarView("nope")).toBe("month");
    expect(parseCalendarView(undefined)).toBe("month");
  });
});

describe("parseAnchor", () => {
  it("parses YYYY-MM-DD as a local date", () => {
    const d = parseAnchor("2026-09-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(15);
  });

  it("falls back to today when the value is invalid", () => {
    const now = new Date(2026, 8, 15);
    expect(isSameDay(parseAnchor("bad", now), now)).toBe(true);
    expect(isSameDay(parseAnchor(undefined, now), now)).toBe(true);
  });
});

describe("rangeFor", () => {
  const anchor = new Date(2026, 8, 15); // Tue 15 Sep 2026

  it("day view spans the anchor only", () => {
    expect(rangeFor("day", anchor)).toEqual({ start: "2026-09-15", end: "2026-09-15" });
  });

  it("week view spans Monday–Friday", () => {
    expect(rangeFor("week", anchor)).toEqual({ start: "2026-09-14", end: "2026-09-18" });
  });

  it("agenda view spans 14 days", () => {
    expect(rangeFor("agenda", anchor)).toEqual({ start: "2026-09-15", end: "2026-09-28" });
  });

  it("month view spans the whole month", () => {
    expect(rangeFor("month", anchor)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
  });
});

describe("shiftAnchor", () => {
  it("moves by the view's unit", () => {
    const anchor = new Date(2026, 8, 15);
    expect(isSameDay(shiftAnchor("day", anchor, 1), new Date(2026, 8, 16))).toBe(true);
    expect(isSameDay(shiftAnchor("week", anchor, 1), new Date(2026, 8, 21))).toBe(true);
    expect(isSameDay(shiftAnchor("agenda", anchor, 1), new Date(2026, 8, 29))).toBe(true);
    expect(isSameDay(shiftAnchor("month", anchor, 1), new Date(2026, 9, 1))).toBe(true);
  });
});

describe("monthCells", () => {
  it("returns weekday cells starting on a Monday", () => {
    const cells = monthCells(new Date(2026, 8, 15));
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) expect(weekdayIndex(cell)).toBeLessThan(5);
    expect(weekdayIndex(cells[0])).toBe(0); // Monday
  });
});

describe("weekdayIndex", () => {
  it("is Monday-based", () => {
    expect(weekdayIndex(new Date(2026, 8, 14))).toBe(0); // Mon
    expect(weekdayIndex(new Date(2026, 8, 20))).toBe(6); // Sun
  });
});

describe("firstOfMonth / addMonths", () => {
  it("returns first of month and shifts months", () => {
    expect(firstOfMonth(new Date(2026, 8, 15)).getDate()).toBe(1);
    expect(addMonths(new Date(2026, 8, 15), 1).getMonth()).toBe(9);
    expect(addMonths(new Date(2026, 0, 15), -1).getFullYear()).toBe(2025);
  });
});

describe("minutesFromMidnight", () => {
  it("parses HH:MM", () => {
    expect(minutesFromMidnight("07:30")).toBe(450);
    expect(minutesFromMidnight("00:00")).toBe(0);
  });
});

describe("timeBlockOffset", () => {
  it("computes top/height and enforces a minimum height", () => {
    const { top, height } = timeBlockOffset("08:00", "09:00", 7, 19, 60);
    expect(top).toBe(60);
    expect(height).toBe(60);
    expect(timeBlockOffset("07:00", "07:01", 7, 19, 60).height).toBeGreaterThanOrEqual(22);
  });
});

describe("layoutTimedRanges", () => {
  it("packs overlapping items into two columns", () => {
    const items = [
      { id: "a", startTime: "08:00", endTime: "09:00" },
      { id: "b", startTime: "08:30", endTime: "09:30" },
      { id: "c", startTime: "10:00", endTime: "11:00" },
    ];
    const layout = layoutTimedRanges(items);
    const byId = Object.fromEntries(layout.map((l) => [l.item.id, l]));
    expect(byId.a.colCount).toBe(2);
    expect(byId.b.colCount).toBe(2);
    expect(byId.a.col).not.toBe(byId.b.col);
    expect(byId.c.colCount).toBe(1);
  });

  it("ignores items without a start time", () => {
    const layout = layoutTimedRanges([{ id: "x", startTime: null, endTime: null }]);
    expect(layout).toHaveLength(0);
  });
});

describe("capitalize", () => {
  it("uppercases the first letter", () => {
    expect(capitalize("septiembre")).toBe("Septiembre");
  });
});
