import { Navigate, createFileRoute, useRouterState } from "@tanstack/react-router";

import { SearchShell } from "@/components/search-shell";
import { SettingsPanel } from "@/components/settings-panel";
import { useAuth } from "@chill-institute/auth/auth";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const auth = useAuth();
  const callbackURL = useRouterState({ select: (state) => state.location.href });

  if (!auth.isAuthenticated) {
    return (
      <Navigate to="/sign-in" search={{ error: undefined, callbackUrl: callbackURL }} replace />
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
