import type { Assessment } from "@/lib/assessments/model";
import {
  ASSESSMENT_IMAGE_BUCKET,
  collectImagePaths,
  injectImageUrls,
} from "@/lib/assessments/rich-text-images";
import { createSessionClient } from "@/lib/supabase/session";

/** Signed URLs are short-lived; the editor/grader render fresh ones on every
 * load, so we never persist them (see {@link stripImageUrls}). */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Resolves every inline image in an assessment (instructions + question
 * prompts) to a signed URL and injects it as `attrs.src`, so the shared
 * renderers can show `<img>`. No-op when the assessment has no images.
 */
export async function resolveAssessmentImages(assessment: Assessment): Promise<Assessment> {
  const paths = new Set<string>([
    ...collectImagePaths(assessment.instructions),
    ...assessment.content.questions.flatMap((question) => collectImagePaths(question.prompt)),
  ]);
  if (paths.size === 0) return assessment;

  const supabase = await createSessionClient();
  const { data, error } = await supabase.storage
    .from(ASSESSMENT_IMAGE_BUCKET)
    .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS);
  if (error || !data) return assessment;

  const urlByPath = new Map<string, string>();
  for (const row of data) {
    if (row.path && row.signedUrl && !row.error) urlByPath.set(row.path, row.signedUrl);
  }

  return {
    ...assessment,
    instructions: injectImageUrls(assessment.instructions, urlByPath),
    content: {
      questions: assessment.content.questions.map((question) => ({
        ...question,
        prompt: injectImageUrls(question.prompt, urlByPath) ?? question.prompt,
      })),
    },
  };
}
