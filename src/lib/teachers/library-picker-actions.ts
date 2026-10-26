"use server";

import { createSessionClient } from "@/lib/supabase/session";
import type { LibraryCollection, LibraryItem } from "@/lib/assessments/library";

function questionCount(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const questions = (content as { questions?: unknown }).questions;
  return Array.isArray(questions) ? questions.length : 0;
}

/**
 * The library as the class picker needs it: collections plus usable items
 * (mine and shared with me), without the usage counts the full page shows.
 *
 * A server action rather than a loader because the "Desde mis evaluaciones…"
 * drawer opens on demand, mid-page, and must be fresh every time it does.
 */
export async function loadLibraryForPicker(): Promise<{
  collections: LibraryCollection[];
  items: LibraryItem[];
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
    supabase.from("exam_library_shares").select("item_id, shared_with"),
  ]);

  if (collectionsResult.error || itemsResult.error) {
    return { collections: [], items: [] };
  }

  const sharedWithMe = new Set(
    (sharesResult.error ? [] : (sharesResult.data ?? []))
      .filter((share) => share.shared_with === ownerId)
      .map((share) => share.item_id),
  );

  const items: LibraryItem[] = (itemsResult.data ?? []).map((row) => {
    const subject = row.subjects as unknown as { name: string | null } | null;
    return {
      id: row.id,
      title: row.title ?? "",
      kind: row.kind === "exam" ? "exam" : "homework",
      collectionId: row.collection_id,
      subjectId: row.subject_id,
      subjectName: subject?.name ?? null,
      gradeLevel: row.grade_level,
      questionCount: questionCount(row.content),
      pointsTotal: Number(row.points_total ?? 0),
      archived: Boolean(row.archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      usedCount: 0,
      shared: sharedWithMe.has(row.id),
      sharedByName: null,
    };
  });

  const collections: LibraryCollection[] = (collectionsResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    itemCount: items.filter((item) => item.collectionId === row.id).length,
  }));

  return { collections, items };
}
