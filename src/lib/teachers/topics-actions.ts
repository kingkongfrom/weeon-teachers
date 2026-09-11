"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { getT } from "@/lib/i18n/server";

export type TopicActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/** Creates a Classwork topic (Tema) in a class the teacher manages. */
export async function createTopic(input: {
  classId: string;
  name: string;
}): Promise<TopicActionResult> {
  const t = await getT();
  const parsed = z
    .object({ classId: z.string().uuid(), name: z.string().trim().min(1).max(120) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: t.topics.error };

  const detail = await loadTeacherGrupo(parsed.data.classId);
  if (!detail) return { ok: false, error: t.topics.error };

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("classwork_topics")
    .insert({ class_id: parsed.data.classId, name: parsed.data.name })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: t.topics.error };

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  return { ok: true, id: data.id };
}
