/**
 * Mis evaluaciones — the teacher's reusable assessment library.
 *
 * A library item holds a definition (title, kind, instructions, questions). Using
 * it in a class **copies** that definition into a new `assessments` draft for
 * that group. The copy is a snapshot: editing the item later never rewrites a
 * group that may already be taking it.
 *
 * Pure helpers here (no React, no Supabase); IO lives in
 * `lib/teachers/library-actions.ts` and `lib/dashboard/library.ts`.
 * Design: `docs/mis-evaluaciones.md`.
 */

import type { AssessmentContent, AssessmentKind, RichTextDoc } from "@/lib/assessments/model";

export type LibraryCollection = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  /** Items filed in it (computed by the loader). */
  itemCount: number;
};

export type LibraryItem = {
  id: string;
  title: string;
  kind: AssessmentKind;
  collectionId: string | null;
  subjectId: string | null;
  subjectName: string | null;
  gradeLevel: string | null;
  questionCount: number;
  pointsTotal: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /** Groups this item has been used in, when known. */
  usedCount: number;
  /** True when another teacher shared it with me (read-only). */
  shared: boolean;
  /** Name of the teacher who shared it, for the Compartidas tab. */
  sharedByName: string | null;
};

/** What a template contributes to a new per-class assessment. */
export type LibraryCopySource = {
  title: string;
  kind: AssessmentKind;
  subjectId: string | null;
  instructions: RichTextDoc | null;
  content: AssessmentContent;
  pointsTotal: number;
};

/**
 * Builds the row for a new per-class assessment from a library item.
 *
 * Placement is deliberately *not* copied: a due date and a published flag only
 * make sense per group, and an imported assessment must land as a draft the
 * teacher can schedule. `library_item_id` keeps the provenance so the UI can say
 * "vino de Mis evaluaciones".
 */
export function assessmentFromLibrary(input: {
  itemId: string;
  source: LibraryCopySource;
  classId: string;
  /** The class's subject when the item has none of its own. */
  fallbackSubjectId: string | null;
  /** Position to append at, so the copy lands last in the class list. */
  position: number;
}): {
  classId: string;
  subjectId: string | null;
  title: string;
  kind: AssessmentKind;
  instructions: RichTextDoc | null;
  content: AssessmentContent;
  pointsTotal: number;
  dueAt: null;
  published: false;
  position: number;
  libraryItemId: string;
} {
  return {
    classId: input.classId,
    subjectId: input.source.subjectId ?? input.fallbackSubjectId,
    title: input.source.title,
    kind: input.source.kind,
    instructions: input.source.instructions,
    content: input.source.content,
    pointsTotal: input.source.pointsTotal,
    dueAt: null,
    published: false,
    position: input.position,
    libraryItemId: input.itemId,
  };
}

/** Groups library items for the listing: one section per collection, plus the
 * items that were never filed. Empty collections still render, so a teacher can
 * drop something into them. */
export function groupItemsByCollection(
  collections: LibraryCollection[],
  items: LibraryItem[],
): Array<{ collection: LibraryCollection | null; items: LibraryItem[] }> {
  const ordered = [...collections].sort((a, b) => a.position - b.position);
  const sections: Array<{ collection: LibraryCollection | null; items: LibraryItem[] }> =
    ordered.map((collection) => ({
      collection,
      items: items.filter((item) => item.collectionId === collection.id),
    }));
  const loose = items.filter(
    (item) => item.collectionId == null || !ordered.some((c) => c.id === item.collectionId),
  );
  if (loose.length > 0) sections.push({ collection: null, items: loose });
  return sections;
}

/** Case/accent-insensitive search across title, subject and level. */
export function filterLibraryItems(
  items: LibraryItem[],
  query: string,
  opts: { subjectId?: string | null; gradeLevel?: string | null } = {},
): LibraryItem[] {
  const needle = normalize(query);
  return items.filter((item) => {
    if (opts.subjectId && item.subjectId !== opts.subjectId) return false;
    if (opts.gradeLevel && (item.gradeLevel ?? "") !== opts.gradeLevel) return false;
    if (!needle) return true;
    return [item.title, item.subjectName ?? "", item.gradeLevel ?? ""].some((value) =>
      normalize(value).includes(needle),
    );
  });
}

/** Distinct, sorted grade levels present in the library (for the filter). */
export function gradeLevelsIn(items: LibraryItem[]): string[] {
  const levels = new Set<string>();
  for (const item of items) {
    const level = item.gradeLevel?.trim();
    if (level) levels.add(level);
  }
  return [...levels].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

/** Items that already hold live grades cannot be updated in place. */
export function canPullLibraryUpdate(input: {
  published: boolean;
  submissionCount: number;
}): boolean {
  return !input.published && input.submissionCount === 0;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
