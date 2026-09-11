import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type StreamPost = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  mine: boolean;
};

/** Announcements on a class stream (newest first). RLS scopes to the class. */
export const loadClassStream = cache(
  async (classId: string): Promise<StreamPost[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("class_stream_posts")
      .select("id, body, created_at, author_profile_id, profiles(name)")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return (
      data as Array<{
        id: string;
        body: string;
        created_at: string;
        author_profile_id: string | null;
        profiles: { name: string } | { name: string }[] | null;
      }>
    ).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        authorName: profile?.name ?? "",
        mine: row.author_profile_id === session.userId,
      };
    });
  },
);
