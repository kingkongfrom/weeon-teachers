"use server";

import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { getT } from "@/lib/i18n/server";
import {
  ASSESSMENT_IMAGE_BUCKET,
  ASSESSMENT_IMAGE_MAX_BYTES,
  assessmentImagePath,
  isAllowedAssessmentImage,
} from "@/lib/assessments/rich-text-images";

export type AssessmentImageResult =
  | { ok: true; path: string; url: string }
  | { ok: false; error: string };

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && "name" in value;
}

/**
 * Uploads one inline image used by a homework/exam's rich text (instructions or
 * a question prompt) and returns its storage `path` (persisted in the doc) plus
 * a short-lived signed `url` (for immediate editor display). RLS: the teacher
 * must manage the class, and the object lives in the class bucket so students
 * and parents can read it.
 */
export async function uploadAssessmentImage(formData: FormData): Promise<AssessmentImageResult> {
  const t = await getT();
  const generic = t.classroom.materialsPanel.errorGeneric;
  const classId = String(formData.get("classId") ?? "");
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const file = formData.get("file");

  if (!z.string().uuid().safeParse(classId).success || !z.string().uuid().safeParse(assessmentId).success) {
    return { ok: false, error: generic };
  }
  if (!isFile(file) || file.size === 0) {
    return { ok: false, error: t.classroom.materialsPanel.errorFileRequired };
  }
  if (file.size > ASSESSMENT_IMAGE_MAX_BYTES) {
    return { ok: false, error: t.classroom.materialsPanel.errorTooLarge };
  }
  if (!isAllowedAssessmentImage(file)) {
    return { ok: false, error: t.classroom.materialsPanel.errorType };
  }

  // RLS-scoped: null when the teacher does not manage this class.
  const detail = await loadTeacherGrupo(classId);
  if (!detail) {
    return { ok: false, error: generic };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string") {
    return { ok: false, error: generic };
  }

  const path = assessmentImagePath({ tenantId, classId, assessmentId, fileName: file.name });
  const { error: uploadError } = await supabase.storage
    .from(ASSESSMENT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) {
    return { ok: false, error: generic };
  }

  const { data, error: signError } = await supabase.storage
    .from(ASSESSMENT_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (signError || !data?.signedUrl) {
    // The object is uploaded and the path is still usable; the editor will just
    // show the image after the next load. Do not fail the insert.
    return { ok: true, path, url: "" };
  }
  return { ok: true, path, url: data.signedUrl };
}
