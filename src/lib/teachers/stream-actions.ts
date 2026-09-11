"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { getT } from "@/lib/i18n/server";

export type StreamActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/** Posts an announcement to a class the teacher manages. */
export async function createAnnouncement(input: {
  classId: string;
  body: string;
}): Promise<StreamActionResult> {
  const t = await getT();
  const parsed = z
    .object({ classId: z.string().uuid(), body: z.string().trim().min(1).max(5000) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: t.stream.error };

  const detail = await loadTeacherGrupo(parsed.data.classId);
  if (!detail) return { ok: false, error: t.stream.error };

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("class_stream_posts")
    .insert({ class_id: parsed.data.classId, kind: "announcement", body: parsed.data.body })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: t.stream.error };

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  return { ok: true, id: data.id };
}

/** Deletes an announcement (RLS: the author, the class teacher, or an admin). */
export async function deleteAnnouncement(input: {
  id: string;
  classId: string;
}): Promise<StreamActionResult> {
  const t = await getT();
  const parsed = z
    .object({ id: z.string().uuid(), classId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: t.stream.error };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("class_stream_posts")
    .delete()
    .eq("id", parsed.data.id)
    .eq("class_id", parsed.data.classId);

  if (error) return { ok: false, error: t.stream.error };

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  return { ok: true };
}
