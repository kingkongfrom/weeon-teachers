import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions, clientSentryDsn } from "@/lib/observability/sentry-config";

Sentry.init(baseSentryOptions(clientSentryDsn()));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
