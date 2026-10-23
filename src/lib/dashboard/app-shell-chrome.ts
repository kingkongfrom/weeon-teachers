import "server-only";

import { cache } from "react";

/*
 * The shell chrome (school name, logo, unread counts, subject chips) does not
 * depend on the locale. Wrapping it in its own Suspense boundary means a
 * language switch refreshes only the page body instead of re-running these
 * Supabase queries before anything can repaint.
 */

export type AppShellChrome = {
  tenantName: string | null;
  logoUrl: string | null;
  attention: {
    unreadInboxCount: number;
    unreadChatCount: number;
    gradingCount: number;
    justificationCount: number;
    justificationHref: string | null;
  };
  subjects: { id: string; name: string; color: string | null }[];
};

/** Previous chrome per tenant, so the shell has no layout shift on refresh. */
const chromeCache = new Map<string, AppShellChrome>();

export const loadAppShellChrome = cache(
  async (
    tenantId: string,
    loaders: {
      tenantName: () => Promise<string | null>;
      logoUrl: () => Promise<string | null>;
      attention: () => Promise<AppShellChrome["attention"]>;
      subjects: () => Promise<AppShellChrome["subjects"]>;
    },
  ): Promise<AppShellChrome> => {
    try {
      const [tenantName, logoUrl, attention, subjects] = await Promise.all([
        loaders.tenantName(),
        loaders.logoUrl(),
        loaders.attention(),
        loaders.subjects(),
      ]);
      const chrome = { tenantName, logoUrl, attention, subjects };
      chromeCache.set(tenantId, chrome);
      return chrome;
    } catch (error) {
      const previous = chromeCache.get(tenantId);
      if (previous) return previous;
      throw error;
    }
  },
);

export function cachedAppShellChrome(tenantId: string): AppShellChrome | null {
  return chromeCache.get(tenantId) ?? null;
}
