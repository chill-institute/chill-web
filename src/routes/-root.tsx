import { AppErrorBoundary } from "@/ui/components/app-error-boundary";
import { AuthProvider } from "@/auth/auth";
import { ChillApiProvider } from "@/lib/api";
import { TooltipProvider } from "@/ui/components/ui/tooltip";
import { RootContent } from "@/routes/-root-content";

function Root() {
  return (
    <AppErrorBoundary release={import.meta.env.VITE_PUBLIC_RELEASE}>
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
