import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions, serverSentryDsn } from "@/lib/observability/sentry-config";

Sentry.init(baseSentryOptions(serverSentryDsn()));
