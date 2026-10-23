import { describe, expect, it } from "vitest";

import type { TeacherLesson } from "@/lib/dashboard/schedule";
import { isLessonLiveNow, liveLessonTone } from "@/lib/dashboard/upcoming";

function lesson(overrides: Partial<TeacherLesson> = {}): TeacherLesson {
  return {
    id: "lesson-1",
    classId: "class-1",
    gradebookSubjectId: "subject-1",
    groupName: "1B",
    title: "Geografía",
    grade: "1",
    section: "B",
    studentCount: 24,
    weekday: "mon",
    startTime: "11:45",
    endTime: "13:15",
    room: "201",
    color: "teal",
    ...overrides,
  };
}

// 2026-10-19 is a Monday. Costa Rica is UTC-6, so 17:00Z = 11:00 local.
function at(iso: string): Date {
  return new Date(iso);
}

describe("liveLessonTone", () => {
  it("returns the subject tone while the class is in progress", () => {
    expect(liveLessonTone(lesson(), at("2026-10-19T18:00:00Z"))).toBe("green");
    expect(
      liveLessonTone(lesson({ color: "blue" }), at("2026-10-19T18:00:00Z")),
    ).toBe("blue");
    expect(
      liveLessonTone(lesson({ color: "amber" }), at("2026-10-19T18:00:00Z")),
    ).toBe("yellow");
    expect(
      liveLessonTone(lesson({ color: "rose" }), at("2026-10-19T18:00:00Z")),
    ).toBe("rose");
    expect(
      liveLessonTone(lesson({ color: "indigo" }), at("2026-10-19T18:00:00Z")),
    ).toBe("purple");
  });

  it("returns null before and after the slot", () => {
    expect(liveLessonTone(lesson(), at("2026-10-19T17:00:00Z"))).toBeNull();
    expect(liveLessonTone(lesson(), at("2026-10-19T19:20:00Z"))).toBeNull();
  });

  it("returns null on another weekday", () => {
    expect(liveLessonTone(lesson(), at("2026-10-20T18:00:00Z"))).toBeNull();
  });

  it("treats the end minute as not live (matches isLessonLiveNow)", () => {
    const now = at("2026-10-19T19:15:00Z");
    expect(isLessonLiveNow(lesson(), now)).toBe(false);
    expect(liveLessonTone(lesson(), now)).toBeNull();
  });

  it("falls back to blue for unknown colors", () => {
    expect(
      liveLessonTone(lesson({ color: "chartreuse" }), at("2026-10-19T18:00:00Z")),
    ).toBe("blue");
  });
});
