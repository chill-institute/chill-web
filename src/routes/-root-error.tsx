import type { ErrorComponentProps } from "@tanstack/react-router";

import { captureAppException, getSentryEventId } from "@/lib/sentry";
import { AppErrorFallback } from "@/ui/components/app-error-fallback";

function RootError({ error }: ErrorComponentProps) {
  const release = import.meta.env.VITE_PUBLIC_RELEASE;
  const sentryEventId =
    getSentryEventId(error) ??
    captureAppException(error, {
      release,
      routePath: window.location.pathname,
    });

  return <AppErrorFallback release={release} error={error} sentryEventId={sentryEventId} />;
}

export { RootError };
