import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type ClassTopic = {
  id: string;
  name: string;
};

/** Classwork topics (Temas) for a class, in order. RLS scopes to the class. */
export const loadClassTopics = cache(
  async (classId: string): Promise<ClassTopic[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("classwork_topics")
      .select("id, name, position")
      .eq("class_id", classId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return (data as Array<{ id: string; name: string }>).map((row) => ({
      id: row.id,
      name: row.name,
    }));
  },
);
