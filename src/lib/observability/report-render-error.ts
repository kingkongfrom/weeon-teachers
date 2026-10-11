import * as Sentry from "@sentry/nextjs";

import { SENTRY_APP } from "@/lib/observability/sentry-config";

export function reportRenderError(error: Error & { digest?: string }, surface: string): void {
  console.error(`[${SENTRY_APP}] ${surface}`, error);

  Sentry.withScope((scope) => {
    scope.setTag("weeon.app", SENTRY_APP);
    scope.setTag("weeon.surface", surface);
    if (error.digest) {
      scope.setExtra("digest", error.digest);
    }
    Sentry.captureException(error);
  });
}
