import { describe, expect, it } from "vitest";
import {
  assessmentFromLibrary,
  canPullLibraryUpdate,
  filterLibraryItems,
  gradeLevelsIn,
  groupItemsByCollection,
  type LibraryCollection,
  type LibraryItem,
} from "./library";

const item = (over: Partial<LibraryItem> & { id: string }): LibraryItem => ({
  title: over.id,
  kind: "homework",
  collectionId: null,
  subjectId: null,
  subjectName: null,
  gradeLevel: null,
  questionCount: 0,
  pointsTotal: 0,
  archived: false,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  usedCount: 0,
  shared: false,
  sharedByName: null,
  ...over,
});

const collection = (over: Partial<LibraryCollection> & { id: string }): LibraryCollection => ({
  name: over.id,
  color: null,
  position: 0,
  itemCount: 0,
  ...over,
});

describe("assessmentFromLibrary", () => {
  const source = {
    title: "Fracciones — evaluación 1",
    kind: "exam" as const,
    subjectId: "math",
    instructions: { type: "doc" as const },
    content: { questions: [] },
    pointsTotal: 40,
  };

  it("copies the definition but never the placement", () => {
    const draft = assessmentFromLibrary({
      itemId: "lib-1",
      source,
      classId: "class-2",
      fallbackSubjectId: "fallback",
      position: 7,
    });
    expect(draft.title).toBe(source.title);
    expect(draft.kind).toBe("exam");
    expect(draft.content).toEqual(source.content);
    expect(draft.pointsTotal).toBe(40);
    // Placement resets: a due date is per group and it starts unpublished.
    expect(draft.dueAt).toBeNull();
    expect(draft.published).toBe(false);
    expect(draft.classId).toBe("class-2");
    expect(draft.position).toBe(7);
    expect(draft.libraryItemId).toBe("lib-1");
  });

  it("falls back to the class subject when the item has none", () => {
    const draft = assessmentFromLibrary({
      itemId: "lib-2",
      source: { ...source, subjectId: null },
      classId: "c",
      fallbackSubjectId: "class-subject",
      position: 0,
    });
    expect(draft.subjectId).toBe("class-subject");
  });

  it("keeps the item's own subject over the class one", () => {
    const draft = assessmentFromLibrary({
      itemId: "lib-3",
      source,
      classId: "c",
      fallbackSubjectId: "class-subject",
      position: 0,
    });
    expect(draft.subjectId).toBe("math");
  });
});

describe("groupItemsByCollection", () => {
  it("orders sections by position and appends unfiled items last", () => {
    const sections = groupItemsByCollection(
      [
        collection({ id: "b", position: 1 }),
        collection({ id: "a", position: 0 }),
      ],
      [
        item({ id: "1", collectionId: "b" }),
        item({ id: "2", collectionId: null }),
        item({ id: "3", collectionId: "a" }),
      ],
    );
    expect(sections.map((s) => s.collection?.id ?? null)).toEqual(["a", "b", null]);
    expect(sections[2].items.map((i) => i.id)).toEqual(["2"]);
  });

  it("keeps an empty collection so items can be filed into it", () => {
    const sections = groupItemsByCollection([collection({ id: "empty" })], []);
    expect(sections).toHaveLength(1);
    expect(sections[0].items).toEqual([]);
  });

  it("does not create a loose section when everything is filed", () => {
    const sections = groupItemsByCollection(
      [collection({ id: "a" })],
      [item({ id: "1", collectionId: "a" })],
    );
    expect(sections.map((s) => s.collection?.id ?? null)).toEqual(["a"]);
  });
});

describe("filterLibraryItems", () => {
  const items = [
    item({ id: "1", title: "Fracciones 1", subjectId: "math", gradeLevel: "8°" }),
    item({ id: "2", title: "Ortografía", subjectId: "esp", gradeLevel: "7°" }),
    item({ id: "3", title: "Examen de fracciones", subjectId: "math", gradeLevel: "9°" }),
  ];

  it("searches without case or accents", () => {
    expect(filterLibraryItems(items, "FRACCIONES").map((i) => i.id)).toEqual(["1", "3"]);
    expect(filterLibraryItems(items, "ortografia").map((i) => i.id)).toEqual(["2"]);
  });

  it("filters by subject and level together", () => {
    expect(filterLibraryItems(items, "", { subjectId: "math" }).map((i) => i.id)).toEqual([
      "1",
      "3",
    ]);
    expect(
      filterLibraryItems(items, "", { subjectId: "math", gradeLevel: "9°" }).map((i) => i.id),
    ).toEqual(["3"]);
  });

  it("returns everything for an empty query and no filters", () => {
    expect(filterLibraryItems(items, "  ")).toHaveLength(3);
  });
});

describe("gradeLevelsIn", () => {
  it("returns distinct levels sorted numerically", () => {
    const items = [
      item({ id: "1", gradeLevel: "10°" }),
      item({ id: "2", gradeLevel: "8°" }),
      item({ id: "3", gradeLevel: "8°" }),
      item({ id: "4", gradeLevel: null }),
    ];
    expect(gradeLevelsIn(items)).toEqual(["8°", "10°"]);
  });
});

describe("canPullLibraryUpdate", () => {
  it("allows a draft with no submissions", () => {
    expect(canPullLibraryUpdate({ published: false, submissionCount: 0 })).toBe(true);
  });

  it("refuses once published or submitted", () => {
    expect(canPullLibraryUpdate({ published: true, submissionCount: 0 })).toBe(false);
    expect(canPullLibraryUpdate({ published: false, submissionCount: 2 })).toBe(false);
  });
});
