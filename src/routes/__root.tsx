import { createRootRouteWithContext } from "@tanstack/react-router";

import type { RouterContext } from "@/router";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

function Root() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </AuthProvider>
  );
}
