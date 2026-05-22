import { createFileRoute } from "@tanstack/react-router";

import { SearchShell } from "@/components/search-shell";
import { SettingsPanel } from "@/components/settings-panel";
import { SignInRedirect } from "@/auth/components/sign-in-redirect";
import { useAuth } from "@/auth/auth";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <SignInRedirect />;
  }

  return (
    <SearchShell>
      <section data-page="settings">
        <h1 className="sr-only">Settings</h1>
        <SettingsPanel />
      </section>
    </SearchShell>
  );
}
