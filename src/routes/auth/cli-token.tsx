import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy address printed by older chilly releases.
export const Route = createFileRoute("/auth/cli-token")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/setup-token", replace: true });
  },
});
