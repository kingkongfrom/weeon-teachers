import "server-only";

import { createSessionClient } from "@/lib/supabase/session";
import type { AssessmentContent, RichTextDoc } from "@/lib/assessments/model";
import type { LibraryCollection, LibraryItem } from "@/lib/assessments/library";

function questionCount(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const questions = (content as { questions?: unknown }).questions;
  return Array.isArray(questions) ? questions.length : 0;
}

type ItemRow = {
  id: string;
  title: string | null;
  kind: string | null;
  collection_id: string | null;
  subject_id: string | null;
  grade_level: string | null;
  content: unknown;
  points_total: number | null;
  archived: boolean | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
  subjects?: { name: string | null } | null;
};

/**
 * The teacher's library: collections plus items (mine and shared with me),
 * with subjects resolved and usage counted.
 *
 * Resilient by design: if the library tables are not migrated yet the page
 * renders its empty state instead of failing, the same way the aula virtual
 * tolerates missing optional columns.
 */
export async function loadAssessmentLibrary(): Promise<{
  collections: LibraryCollection[];
  items: LibraryItem[];
  ownerId: string | null;
}> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerId = user?.id ?? null;

  const [collectionsResult, itemsResult, sharesResult] = await Promise.all([
    supabase
      .from("exam_library_collections")
      .select("id, name, color, position")
      .order("position"),
    supabase
      .from("exam_library_items")
      .select(
        "id, title, kind, collection_id, subject_id, grade_level, content, points_total, archived, created_at, updated_at, owner_id, subjects(name)",
      )
      .eq("archived", false)
      .order("updated_at", { ascending: false }),
    supabase.from("exam_library_shares").select("item_id, shared_with, shared_by"),
  ]);

  if (collectionsResult.error || itemsResult.error) {
    return { collections: [], items: [], ownerId };
  }

  const shares = sharesResult.error ? [] : (sharesResult.data ?? []);
  const sharedWithMe = new Set(
    shares.filter((share) => share.shared_with === ownerId).map((share) => share.item_id),
  );

  // Who shared each item with me (for the Compartidas tab subtitle).
  const sharerIds = [
    ...new Set(
      shares
        .filter((share) => share.shared_with === ownerId)
        .map((share) => share.shared_by)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const sharerNames = new Map<string, string>();
  if (sharerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", sharerIds);
    for (const profile of profiles ?? []) {
      sharerNames.set(profile.id, profile.name ?? "");
    }
  }
  const sharerForItem = new Map<string, string>();
  for (const share of shares) {
    if (share.shared_with !== ownerId) continue;
    sharerForItem.set(share.item_id, sharerNames.get(share.shared_by) ?? "");
  }

  // Usage: how many per-class assessments came from each item.
  const usedCount = new Map<string, number>();
  const { data: copies } = await supabase
    .from("assessments")
    .select("library_item_id")
    .not("library_item_id", "is", null);
  for (const copy of copies ?? []) {
    const id = copy.library_item_id as string | null;
    if (!id) continue;
    usedCount.set(id, (usedCount.get(id) ?? 0) + 1);
  }

  const rows = (itemsResult.data ?? []) as unknown as ItemRow[];
  const items: LibraryItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    kind: row.kind === "exam" ? "exam" : "homework",
    collectionId: row.collection_id,
    subjectId: row.subject_id,
    subjectName: row.subjects?.name ?? null,
    gradeLevel: row.grade_level,
    questionCount: questionCount(row.content),
    pointsTotal: Number(row.points_total ?? 0),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usedCount: usedCount.get(row.id) ?? 0,
    shared: sharedWithMe.has(row.id),
    sharedByName: sharedWithMe.has(row.id) ? (sharerForItem.get(row.id) ?? null) : null,
  }));

  const collections: LibraryCollection[] = (collectionsResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    itemCount: items.filter((item) => item.collectionId === row.id).length,
  }));

  return { collections, items, ownerId };
}

/** One item's full definition, for the preview and for copying into a class. */
export async function loadLibraryItem(id: string): Promise<{
  id: string;
  title: string;
  kind: "homework" | "exam";
  subjectId: string | null;
  gradeLevel: string | null;
  instructions: RichTextDoc | null;
  content: AssessmentContent;
  pointsTotal: number;
  archived: boolean;
  ownerId: string;
  shared: boolean;
} | null> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("exam_library_items")
    .select(
      "id, title, kind, subject_id, grade_level, instructions, content, points_total, archived, owner_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const content = (data.content ?? { questions: [] }) as AssessmentContent;
  return {
    id: data.id,
    title: data.title ?? "",
    kind: data.kind === "exam" ? "exam" : "homework",
    subjectId: data.subject_id,
    gradeLevel: data.grade_level,
    instructions: (data.instructions ?? null) as RichTextDoc | null,
    content: Array.isArray(content.questions) ? content : { questions: [] },
    pointsTotal: Number(data.points_total ?? 0),
    archived: Boolean(data.archived),
    ownerId: data.owner_id,
    shared: user?.id != null && data.owner_id !== user.id,
  };
}
