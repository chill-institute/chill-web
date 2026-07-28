import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";

import { isClientRequestTimeoutError } from "@/api/request-timeout";
import { captureAppException } from "@/lib/sentry";
import { RootError } from "@/routes/-root-error";
import { BackendUnavailableScreen } from "@/ui/components/backend-unavailable-screen";

function MoviesError(props: ErrorComponentProps) {
  const router = useRouter();

  if (!isClientRequestTimeoutError(props.error)) return <RootError {...props} />;

  return (
    <BackendUnavailableScreen
      reloadAfterRetry={false}
      onRetry={() => router.invalidate({ sync: true })}
    />
  );
}

function reportMoviesError(error: unknown) {
  if (!isClientRequestTimeoutError(error)) return;

  captureAppException(error, {
    release: import.meta.env.VITE_PUBLIC_RELEASE,
    routePath: window.location.pathname,
  });
}

export { MoviesError, reportMoviesError };
