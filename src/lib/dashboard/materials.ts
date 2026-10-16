import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

const MATERIAL_BUCKET = "class-materials";
const THUMB_TTL_SEC = 60 * 60 * 6;

export type ClassMaterial = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  subjectId: string | null;
  topicId: string | null;
  createdAt: string;
  /** Signed URL of the generated preview image, or null when none exists. */
  thumbnailUrl: string | null;
};

/** Documents a teacher has shared with a class. RLS scopes rows to the classes
 * the signed-in teacher can see (`teaches_class`). */
export const loadClassMaterials = cache(
  async (classId: string): Promise<ClassMaterial[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("class_materials")
      .select(
        "id, title, description, file_name, mime_type, size_bytes, subject_id, topic_id, created_at, thumbnail_path",
      )
      .eq("class_id", classId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const rows = data as Array<{
      id: string;
      title: string;
      description: string | null;
      file_name: string;
      mime_type: string | null;
      size_bytes: number | null;
      subject_id: string | null;
      topic_id: string | null;
      created_at: string;
      thumbnail_path: string | null;
    }>;

    const thumbPaths = rows
      .map((row) => row.thumbnail_path)
      .filter((path): path is string => typeof path === "string" && path.length > 0);
    const signed = new Map<string, string>();
    if (thumbPaths.length > 0) {
      const { data: urls } = await supabase.storage
        .from(MATERIAL_BUCKET)
        .createSignedUrls(thumbPaths, THUMB_TTL_SEC);
      for (const row of urls ?? []) {
        if (row.path && row.signedUrl && !row.error) signed.set(row.path, row.signedUrl);
      }
    }

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      subjectId: row.subject_id,
      topicId: row.topic_id,
      createdAt: row.created_at,
      thumbnailUrl: row.thumbnail_path ? (signed.get(row.thumbnail_path) ?? null) : null,
    }));
  },
);

