import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

import { AppErrorBoundary } from "@/ui/components/app-error-boundary";
import { AuthProvider } from "@/auth/auth";
import { ChillApiProvider } from "@/lib/api";
import { TooltipProvider } from "@/ui/components/ui/tooltip";
import { RootContent } from "@/routes/-root-content";
import { addAppBreadcrumb } from "@/lib/sentry";

function RouteBreadcrumb() {
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    addAppBreadcrumb("route", { path: pathname });
  }, [pathname]);

  return null;
}

function Root() {
  return (
    <AppErrorBoundary release={import.meta.env.VITE_PUBLIC_RELEASE}>
      <RouteBreadcrumb />
      <AuthProvider>
        <ChillApiProvider>
          <TooltipProvider>
            <RootContent />
          </TooltipProvider>
        </ChillApiProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export { Root };
