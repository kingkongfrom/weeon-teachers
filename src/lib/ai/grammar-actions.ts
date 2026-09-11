"use server";

import { getT } from "@/lib/i18n/server";

/**
 * Grammar/spelling check via LanguageTool. Server-only: the request is made
 * from the server so no provider URL/key is exposed, and the teacher's text is
 * never sent from the browser.
 *
 * Set `LANGUAGETOOL_URL` to a self-hosted instance to keep text on our infra
 * (recommended for a school product); otherwise it falls back to the public
 * LanguageTool API. `LANGUAGETOOL_API_KEY` is optional (paid/self-host).
 */

export type GrammarIssue = {
  offset: number;
  length: number;
  message: string;
  replacements: string[];
  ruleId: string | null;
};

export type GrammarResult =
  | { ok: true; issues: GrammarIssue[] }
  | { ok: false; error: string };

const MAX_CHARS = 20_000;
const CACHE_MAX = 200;
/** Text is user-authored; cache by language+text to avoid duplicate API calls. */
const cache = new Map<string, GrammarIssue[]>();

/** "auto" lets LanguageTool detect the language, so content language is never
 * forced to match the UI locale (a Spanish sentence is checked as Spanish even
 * when the app is in English). */
function normalizeLanguage(language: string | undefined): string {
  if (language === "es") return "es";
  if (language === "en-US" || language === "en") return "en-US";
  return "auto";
}

type LanguageToolMatch = {
  offset: number;
  length: number;
  message: string;
  rule?: { id?: string };
  replacements?: Array<{ value: string }>;
};

export async function checkGrammar(input: {
  text: string;
  language?: string;
}): Promise<GrammarResult> {
  const t = await getT();
  // IMPORTANT: send the text exactly as the client mapped it. Trimming or
  // rewriting it would shift every character offset and corrupt the mapping.
  const text = input.text;

  if (!text.trim()) return { ok: true, issues: [] };
  if (text.length > MAX_CHARS) {
    return { ok: false, error: t.editor.grammarTooLong };
  }

  const language = normalizeLanguage(input.language);
  const cacheKey = `${language}:${text}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ok: true, issues: cached };

  const base = (
    process.env.LANGUAGETOOL_URL?.trim() || "https://api.languagetool.org"
  ).replace(/\/+$/, "");
  const apiKey = process.env.LANGUAGETOOL_API_KEY?.trim();

  const body = new URLSearchParams({ language, text });

  try {
    const response = await fetch(`${base}/v2/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return { ok: false, error: t.editor.grammarUnavailable };
    }

    const data = (await response.json()) as { matches?: LanguageToolMatch[] };
    const issues: GrammarIssue[] = (data.matches ?? []).map((match) => ({
      offset: match.offset,
      length: match.length,
      message: match.message,
      replacements: (match.replacements ?? [])
        .map((replacement) => replacement.value)
        .slice(0, 5),
      ruleId: match.rule?.id ?? null,
    }));

    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(cacheKey, issues);

    return { ok: true, issues };
  } catch {
    return { ok: false, error: t.editor.grammarUnavailable };
  }
}
