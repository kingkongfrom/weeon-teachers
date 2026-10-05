import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { WEEON_LETTER_WORDMARK_CID } from "@/lib/email/letter";

/** Weeon School wordmark for the navy header. Same file as the school ERP. */
export async function loadWordmarkAttachment(): Promise<{
  filename: string;
  content: Buffer;
  contentId: string;
}> {
  const content = await readFile(join(process.cwd(), "public", "email", "logo-wordmark.png"));
  return {
    filename: "logo-wordmark.png",
    content,
    contentId: WEEON_LETTER_WORDMARK_CID,
  };
}
