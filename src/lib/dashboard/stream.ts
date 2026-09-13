import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type StreamComment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  mine: boolean;
};

export type StreamPost = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  mine: boolean;
  comments: StreamComment[];
};

type ProfileEmbed = { name: string } | { name: string }[] | null;

function profileName(embed: ProfileEmbed): string {
  const profile = Array.isArray(embed) ? embed[0] : embed;
  return profile?.name ?? "";
}

/** Announcements (with comments) on a class stream. RLS scopes to the class. */
export const loadClassStream = cache(
  async (classId: string): Promise<StreamPost[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("class_stream_posts")
      .select(
        "id, body, created_at, author_profile_id, profiles(name), class_stream_comments(id, body, created_at, author_profile_id, profiles(name))",
      )
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "class_stream_comments", ascending: true });

    if (error || !data) return [];

    return (
      data as Array<{
        id: string;
        body: string;
        created_at: string;
        author_profile_id: string | null;
        profiles: ProfileEmbed;
        class_stream_comments: Array<{
          id: string;
          body: string;
          created_at: string;
          author_profile_id: string | null;
          profiles: ProfileEmbed;
        }> | null;
      }>
    ).map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorName: profileName(row.profiles),
      mine: row.author_profile_id === session.userId,
      comments: (row.class_stream_comments ?? []).map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.created_at,
        authorName: profileName(comment.profiles),
        mine: comment.author_profile_id === session.userId,
      })),
    }));
  },
);
