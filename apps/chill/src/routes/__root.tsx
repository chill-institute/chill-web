import { createRootRouteWithContext, type ErrorComponentProps } from "@tanstack/react-router";

import type { RouterContext } from "@/router";
import { AppErrorBoundary } from "@chill-institute/ui/components/app-error-boundary";
import { AppErrorFallback } from "@chill-institute/ui/components/app-error-fallback";
import { AppShell } from "@/components/app-shell";
import { BackendUnavailableScreen } from "@chill-institute/ui/components/backend-unavailable-screen";
import { NotFoundScreen } from "@chill-institute/ui/components/not-found-screen";
import { AuthProvider } from "@chill-institute/auth/auth";
import { ChillApiProvider } from "@/lib/api";
import { BackendHealthProvider, useBackendUnavailable } from "@/hooks/use-backend-unavailable";
import { Toaster } from "@chill-institute/ui/components/ui/toaster";
import { TooltipProvider } from "@chill-institute/ui/components/ui/tooltip";
import { UserMessageModal } from "@/components/user-message-modal";
import { UserMessagesProvider } from "@/components/user-messages-provider";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
});

function Root() {
  return (
    <AppErrorBoundary app="chill.institute/web" release={import.meta.env.VITE_PUBLIC_RELEASE}>
      <AuthProvider>
        <ChillApiProvider>
          <TooltipProvider>
            <BackendHealthProvider>
              <RootContent />
            </BackendHealthProvider>
          </TooltipProvider>
        </ChillApiProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

function RootContent() {
  const { isBackendUnavailable, retry } = useBackendUnavailable();

  if (isBackendUnavailable) {
    return <BackendUnavailableScreen onRetry={retry} />;
  }

  return (
    <UserMessagesProvider>
      <AppShell />
      <UserMessageModal />
      <Toaster />
    </UserMessagesProvider>
  );
}

function RootError({ error }: ErrorComponentProps) {
  return (
    <AppErrorFallback
      app="chill.institute/web"
      release={import.meta.env.VITE_PUBLIC_RELEASE}
      error={error}
    />
  );
}

function RootNotFound() {
  return <NotFoundScreen />;
}
