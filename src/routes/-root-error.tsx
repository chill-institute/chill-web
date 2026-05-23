import type { ErrorComponentProps } from "@tanstack/react-router";

import { AppErrorFallback } from "@/ui/components/app-error-fallback";

function RootError({ error }: ErrorComponentProps) {
  return (
    <AppErrorFallback
      app="chill.institute/web"
      release={import.meta.env.VITE_PUBLIC_RELEASE}
      error={error}
    />
  );
}

export { RootError };
