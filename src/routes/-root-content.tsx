import { AppShell } from "@/components/app-shell";
import { BackendUnavailableScreen } from "@/ui/components/backend-unavailable-screen";
import { Toaster } from "@/ui/components/ui/toaster";
import { useBackendUnavailable } from "@/hooks/use-backend-unavailable";

function RootContent() {
  const { isBackendUnavailable, retry } = useBackendUnavailable();

  if (isBackendUnavailable) {
    return <BackendUnavailableScreen onRetry={retry} />;
  }

  return (
    <>
      <AppShell />
      <Toaster />
    </>
  );
}

export { RootContent };
