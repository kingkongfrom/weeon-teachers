import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type ClassMaterial = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  subjectId: string | null;
  createdAt: string;
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
        "id, title, description, file_name, mime_type, size_bytes, subject_id, created_at",
      )
      .eq("class_id", classId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return (data as Array<{
      id: string;
      title: string;
      description: string | null;
      file_name: string;
      mime_type: string | null;
      size_bytes: number | null;
      subject_id: string | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      subjectId: row.subject_id,
      createdAt: row.created_at,
    }));
  },
);
