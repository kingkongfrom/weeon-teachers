import "server-only";

import { cache } from "react";
import { getCommsActor } from "@/lib/dashboard/comms-session";

export type TeacherCircularRow = {
  id: string;
  title: string;
  description: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  publishedAt: string;
  targetCount: number;
};

export type CircularCategory = {
  id: string;
  name: string;
  color: string | null;
};

/** Circulares this teacher has published (own author scope). */
export const loadTeacherCirculars = cache(async (): Promise<TeacherCircularRow[]> => {
  const session = await getCommsActor();
  if (!session) return [];

  const { data, error } = await session.actor.rpc("list_my_published_circulars");
  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    description: (row.description as string | null) ?? null,
    categoryName: (row.category_name as string | null) ?? null,
    categoryColor: (row.category_color as string | null) ?? null,
    publishedAt: String(row.published_at ?? ""),
    targetCount: Number(row.target_count ?? 0),
  }));
});

/** Categories available to file a circular under. */
export const loadCircularCategories = cache(async (): Promise<CircularCategory[]> => {
  const session = await getCommsActor();
  if (!session) return [];

  const { data } = await session.actor
    .from("document_categories")
    .select("id, name, color")
    .order("name", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? "",
    color: (row.color as string | null) ?? null,
  }));
});
