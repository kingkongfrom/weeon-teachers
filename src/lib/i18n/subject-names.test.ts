import { describe, expect, it } from "vitest";

import { isTranslatedSubjectName, subjectNameForLocale, subjectTranslationForLocale } from "@/lib/i18n/subject-names";

describe("subjectNameForLocale", () => {
  it("translates known subjects to English", () => {
    expect(subjectNameForLocale("Ciencias", "en")).toBe("Science");
    expect(subjectNameForLocale("Español", "en")).toBe("Spanish");
    expect(subjectNameForLocale("Matemática", "en")).toBe("Mathematics");
    expect(subjectNameForLocale("Inglés", "en")).toBe("English");
  });

  it("keeps the stored Spanish name in Spanish sessions", () => {
    expect(subjectNameForLocale("Ciencias", "es")).toBe("Ciencias");
    expect(subjectNameForLocale("Español", "es")).toBe("Español");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(subjectNameForLocale("  ciencias  ", "en")).toBe("Science");
    expect(subjectNameForLocale("CIENCIAS", "en")).toBe("Science");
  });

  it("leaves unknown or custom subjects untouched", () => {
    expect(subjectNameForLocale("Robótica", "en")).toBe("Robótica");
    expect(subjectNameForLocale("Taller de música coral", "en")).toBe("Taller de música coral");
  });

  it("returns null for an empty name", () => {
    expect(subjectNameForLocale(null, "en")).toBeNull();
    expect(subjectNameForLocale("", "en")).toBeNull();
  });
});

describe("isTranslatedSubjectName", () => {
  it("recognises both languages of a known subject", () => {
    expect(isTranslatedSubjectName("Ciencias")).toBe(true);
    expect(isTranslatedSubjectName("Science")).toBe(true);
  });

  it("does not claim unknown names", () => {
    expect(isTranslatedSubjectName("Robótica")).toBe(false);
  });
});

describe("subjectTranslationForLocale", () => {
  it("returns the other language's name", () => {
    expect(subjectTranslationForLocale("Ciencias", "es")).toBe("Science");
    expect(subjectTranslationForLocale("Ciencias", "en")).toBe("Ciencias");
    expect(subjectTranslationForLocale("Matemáticas", "en")).toBe("Matemáticas");
  });

  it("works from a stored English name", () => {
    expect(subjectNameForLocale("Science", "es")).toBe("Ciencias");
    expect(subjectTranslationForLocale("Science", "en")).toBe("Ciencias");
    expect(isTranslatedSubjectName("Science")).toBe(true);
  });

  it("returns null when there is nothing to show", () => {
    expect(subjectTranslationForLocale("Robótica", "es")).toBeNull();
    expect(subjectTranslationForLocale(null, "es")).toBeNull();
  });
});
