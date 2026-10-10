import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeListTime } from "@/lib/comms/relative-list-time";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatRelativeListTime", () => {
  const now = new Date("2026-09-15T18:00:00Z");

  it("returns an empty string for an invalid date", () => {
    expect(formatRelativeListTime("not-a-date")).toBe("");
  });

  it("returns 'ahora' under a minute", () => {
    vi.setSystemTime(now);
    expect(formatRelativeListTime("2026-09-15T17:59:40Z")).toBe("ahora");
  });

  it("returns minutes under an hour", () => {
    vi.setSystemTime(now);
    expect(formatRelativeListTime("2026-09-15T17:30:00Z")).toBe("30 min");
  });

  it("returns hours under a day", () => {
    vi.setSystemTime(now);
    expect(formatRelativeListTime("2026-09-15T12:00:00Z")).toBe("6 h");
  });

  it("returns days under a week", () => {
    vi.setSystemTime(now);
    expect(formatRelativeListTime("2026-09-12T18:00:00Z")).toBe("3 d");
  });

  it("falls back to a short date after a week", () => {
    vi.setSystemTime(now);
    const label = formatRelativeListTime("2026-08-01T18:00:00Z");
    expect(label).not.toBe("");
    expect(label).not.toMatch(/min| h| d$/);
  });
});
