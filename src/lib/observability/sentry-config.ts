import type * as Sentry from "@sentry/nextjs";

type SentryInitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

/** Sentry project tag — teacher web (`teachers.weeon.school`). */
export const SENTRY_APP = "weeon-teachers";

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function serverSentryDsn(): string | undefined {
  return trimEnv(process.env.SENTRY_DSN) ?? trimEnv(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function clientSentryDsn(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function sentryEnvironment(): string {
  return (
    trimEnv(process.env.SENTRY_ENVIRONMENT) ??
    trimEnv(process.env.VERCEL_ENV) ??
    trimEnv(process.env.ENVIRONMENT) ??
    process.env.NODE_ENV ??
    "development"
  );
}

/**
 * Errors that are real, unavoidable, and never actionable.
 *
 * `UnrecognizedActionError` is thrown by Next's own router (error E715) when a
 * tab loaded before a deploy posts a Server Action whose id no longer exists
 * in the new build. Every deploy causes it for every open tab, it fixes itself
 * on reload, and the app cannot catch it: Next throws inside the router's
 * fetch loop. Reporting it only teaches the team to ignore Sentry.
 */
const IGNORED_CLIENT_ERRORS = [
  /UnrecognizedActionError/,
  // Aborts the user or the router caused; the UI already shows its retry state.
  /^The operation was aborted\.?$/,
  /^AbortError/,
];

/**
 * A login Server Action POST the browser cancelled because the page navigated
 * or was reloaded. Only dropped on the signed-out flows, where every attempt is
 * a fresh POST and a cancelled one must not page anyone.
 */
function isAbandonedLoginRequest(event: Sentry.ErrorEvent): boolean {
  const value = String(event.exception?.values?.[0]?.value ?? "");
  if (!/^Load failed$|^Failed to fetch$|^NetworkError/.test(value)) return false;
  const url = event.request?.url ?? "";
  if (!url) return true;
  try {
    const path = new URL(url).pathname;
    return ["/", "/crear-contrasena", "/recuperar-contrasena", "/restablecer-contrasena"].includes(path);
  } catch {
    return false;
  }
}

export function baseSentryOptions(dsn: string | undefined): SentryInitOptions {
  const enabled = Boolean(dsn);
  const isProd = process.env.NODE_ENV === "production";

  return {
    dsn,
    enabled,
    environment: sentryEnvironment(),
    release: trimEnv(process.env.SENTRY_RELEASE),
    tracesSampleRate: enabled ? (isProd ? 0.1 : 1) : 0,
    ignoreErrors: IGNORED_CLIENT_ERRORS,
    beforeSend(event) {
      if (isAbandonedLoginRequest(event)) return null;
      return event;
    },
    initialScope: {
      tags: { "weeon.app": SENTRY_APP },
    },
  };
}
