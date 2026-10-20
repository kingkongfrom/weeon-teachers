import { describe, expect, it } from "vitest";
import {
  isTeacherSenderEmail,
  senderIdentityForAuthor,
  tenantEmailIdentity,
} from "@/lib/email/tenant-from";

const school = tenantEmailIdentity({
  displayName: "Colegio Ejemplo",
  replyTo: "secretaria@colegio.cr",
});

describe("isTeacherSenderEmail", () => {
  it("accepts a real mailbox", () => {
    expect(isTeacherSenderEmail("ana.perez@colegio.cr")).toBe(true);
  });

  it("rejects synthetic sign-in addresses and placeholders", () => {
    expect(isTeacherSenderEmail("aperez@colegio.accounts.weeon.school")).toBe(false);
    expect(isTeacherSenderEmail("aperez@colegio.accounts.weeon.cr")).toBe(false);
    expect(isTeacherSenderEmail("x@example.com")).toBe(false);
    expect(isTeacherSenderEmail("")).toBe(false);
    expect(isTeacherSenderEmail(null)).toBe(false);
  });
});

describe("senderIdentityForAuthor", () => {
  it("shows the teacher and replies to their address", () => {
    const identity = senderIdentityForAuthor(school, {
      name: "Ana Pérez",
      email: "Ana.Perez@Colegio.cr",
    });
    expect(identity.displayName).toBe("Ana Pérez · Colegio Ejemplo");
    expect(identity.replyTo).toBe("ana.perez@colegio.cr");
    // Resend keeps its verified mailbox in the address itself.
    expect(identity.from).toContain("<");
    expect(identity.from).toContain("Ana Pérez · Colegio Ejemplo");
  });

  it("falls back to the school when the teacher has no real mailbox", () => {
    const synthetic = senderIdentityForAuthor(school, {
      name: "Ana Pérez",
      email: "aperez@colegio.accounts.weeon.school",
    });
    expect(synthetic).toEqual(school);
    expect(senderIdentityForAuthor(school, { name: "Ana" })).toEqual(school);
  });

  it("uses the teacher name alone when the school has no display name", () => {
    const bare = tenantEmailIdentity({});
    const identity = senderIdentityForAuthor(bare, {
      name: "Ana Pérez",
      email: "ana@colegio.cr",
    });
    expect(identity.displayName).toBe("Ana Pérez");
  });

  it("strips characters that could break the header", () => {
    const identity = senderIdentityForAuthor(school, {
      name: 'Ana <script>"x"',
      email: "ana@colegio.cr",
    });
    expect(identity.displayName).not.toContain("<");
    expect(identity.displayName).not.toContain(">");
    expect(identity.displayName).not.toContain('"');
  });
});
