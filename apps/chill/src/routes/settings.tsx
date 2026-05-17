import { Navigate, createFileRoute } from "@tanstack/react-router";

import { SearchShell } from "@/components/search-shell";
import { SettingsPanel } from "@/components/settings-panel";
import { readCurrentCallbackPath, useAuth } from "@chill-institute/auth/auth";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const auth = useAuth();
  const callbackURL = readCurrentCallbackPath();

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to="/sign-in"
        search={{ error: undefined, callbackUrl: callbackURL ?? undefined }}
        replace
      />
    );
  }

  return (
    <SearchShell>
      <section data-page="settings">
        <SettingsPanel />
      </section>
    </SearchShell>
  );
}
