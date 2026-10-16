import { describe, expect, it } from "vitest";
import { isTeacherPortalRole } from "@/lib/auth/portal-role";

describe("isTeacherPortalRole", () => {
  it("allows a teacher and refuses every other role", () => {
    expect(isTeacherPortalRole("teacher")).toBe(true);
    expect(isTeacherPortalRole("admin")).toBe(false);
    expect(isTeacherPortalRole("student")).toBe(false);
    expect(isTeacherPortalRole("parent")).toBe(false);
    expect(isTeacherPortalRole(null)).toBe(false);
    expect(isTeacherPortalRole(undefined)).toBe(false);
  });
});
