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

export function baseSentryOptions(dsn: string | undefined): SentryInitOptions {
  const enabled = Boolean(dsn);
  const isProd = process.env.NODE_ENV === "production";

  return {
    dsn,
    enabled,
    environment: sentryEnvironment(),
    release: trimEnv(process.env.SENTRY_RELEASE),
    tracesSampleRate: enabled ? (isProd ? 0.1 : 1) : 0,
    initialScope: {
      tags: { "weeon.app": SENTRY_APP },
    },
  };
}
