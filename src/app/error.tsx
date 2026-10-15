"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/brand/error-screen";
import { reportRenderError } from "@/lib/observability/report-render-error";

/** Route-segment error boundary. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRenderError(error, "error-boundary");
  }, [error]);

  return <ErrorScreen error={error} reset={reset} />;
}
