import { Navigate, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";

import { SettingsPanel } from "@/components/settings-panel";
import { SettingsModal } from "@chill-institute/ui/components/settings-modal";
import { useAuth } from "@chill-institute/auth/auth";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const callbackURL = useRouterState({ select: (state) => state.location.href });

  if (!auth.isAuthenticated) {
    return (
      <Navigate to="/sign-in" search={{ error: undefined, callbackUrl: callbackURL }} replace />
    );
  }

  return (
    <SettingsModal
      open
      description="Adjust your binge preferences, download folder, and home page visibility."
      onOpenChange={(open) => {
        if (!open) {
          void navigate({ to: "/" });
        }
      }}
    >
      <SettingsPanel />
    </SettingsModal>
  );
}
